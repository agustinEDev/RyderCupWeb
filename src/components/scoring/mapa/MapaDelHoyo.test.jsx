import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { orientacionDelHoyo, limitesDelHoyo } from '../../../domain/services/geometriaDelHoyo';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }),
}));

// MapLibre de mentira: guarda lo que se le pide para poder comprobarlo
const mapas = vi.hoisted(() => []);
vi.mock('maplibre-gl', () => {
  class Map {
    constructor(opciones) {
      this.opciones = opciones;
      this.oyentes = {};
      this.fuentes = {};
      this.fitBounds = vi.fn();
      this.easeTo = vi.fn();
      this.jumpTo = vi.fn();
      this.resetNorth = vi.fn();
      this.remove = vi.fn();
      this.addLayer = vi.fn();
      this.touchZoomRotate = { disableRotation: vi.fn() };
      this.keyboard = { disableRotation: vi.fn() };
      mapas.push(this);
    }
    on(evento, fn) {
      this.oyentes[evento] = fn;
      return this;
    }
    addSource(id, fuente) {
      this.fuentes[id] = fuente;
    }
    getSource(id) {
      return this.fuentes[id] ? { setData: (d) => { this.fuentes[id].data = d; } } : undefined;
    }
  }
  class Marker {
    constructor() {
      this.remove = vi.fn();
      mapas.marcas = [...(mapas.marcas ?? []), this];
    }
    setLngLat(p) {
      this.p = p;
      return this;
    }
    addTo() {
      return this;
    }
  }
  return { Map, Marker, setWorkerUrl: vi.fn() };
});

const centro = vi.hoisted(() => ({ valor: null, args: null }));
vi.mock('../../../hooks/useCentroSinMapa', () => ({
  useCentroSinMapa: (args) => {
    centro.args = args;
    return centro.valor;
  },
  recordarPosicion: (p) => {
    centro.recordada = p;
    centro.veces = (centro.veces ?? 0) + 1;
  },
}));

const { default: MapaDelHoyo } = await import('./MapaDelHoyo');

const GREEN = {
  front: { lat: 36.2898, lon: -5.332 },
  center: { lat: 36.29, lon: -5.332 },
  back: { lat: 36.2902, lon: -5.332 },
};
const HOYO = { playLine: [{ lat: 36.28, lon: -5.33 }, { lat: 36.285, lon: -5.331 }, GREEN.center], green: GREEN };
const SIN_GREEN = { playLine: [{ lat: 36.28, lon: -5.33 }, { lat: 36.285, lon: -5.331 }], green: null };

const gpsFalso = () => {
  const gps = { watchPosition: vi.fn(), clearWatch: vi.fn(), exito: null, error: null };
  gps.watchPosition.mockImplementation((exito, error) => {
    gps.exito = exito;
    gps.error = error;
    return 3;
  });
  return gps;
};
const lectura = (lat, lon, accuracy = 5) => ({ coords: { latitude: lat, longitude: lon, accuracy } });

const abrir = (props = {}) =>
  render(
    <MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={HOYO} atribucion={null} onCerrar={() => {}} {...props} />
  );
const mapa = () => mapas.at(-1);

describe('MapaDelHoyo', () => {
  let gps;

  beforeEach(() => {
    mapas.length = 0;
    centro.valor = null;
    centro.recordada = undefined;
    centro.veces = 0;
    mapas.marcas = [];
    gps = gpsFalso();
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gps });
  });

  afterEach(() => vi.unstubAllGlobals());

  describe('abrir y cerrar', () => {
    it('A1: a pantalla completa, como diálogo con su título', () => {
      abrir();

      const dialogo = screen.getByRole('dialog');
      expect(dialogo).toHaveClass('fixed', 'inset-0');
      expect(dialogo).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText('mapa.titulo {"numero":1,"par":4}')).toBeInTheDocument();
    });

    it('A2/A3: el GPS se pide al abrir y se apaga al cerrar', () => {
      const { unmount } = abrir();
      expect(gps.watchPosition).toHaveBeenCalledTimes(1);

      unmount();

      expect(gps.clearWatch).toHaveBeenCalledWith(3);
      expect(mapa().remove).toHaveBeenCalled();
    });

    it('«Cerrar» y la tecla Escape cierran', () => {
      const onCerrar = vi.fn();
      abrir({ onCerrar });

      fireEvent.click(screen.getByRole('button', { name: 'mapa.cerrar' }));
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onCerrar).toHaveBeenCalledTimes(2);
    });
  });

  describe('hoyo con mapa', () => {
    it('H1: el hoyo entero con la salida abajo, y sin giro', () => {
      abrir();

      const bearing = orientacionDelHoyo(HOYO);
      expect(mapa().opciones.bearing).toBeCloseTo(bearing, 6);
      expect(mapa().opciones.dragRotate).toBe(false);
      expect(mapa().opciones.pitchWithRotate).toBe(false);
      expect(mapa().touchZoomRotate.disableRotation).toHaveBeenCalled();
      expect(mapa().fitBounds).toHaveBeenCalledWith(limitesDelHoyo(HOYO), expect.objectContaining({ bearing }));
    });

    it('dibuja la línea de juego y el green', () => {
      abrir();
      act(() => mapa().oyentes.load());

      const tipos = mapa().fuentes.hoyo.data.features.map((f) => f.geometry.type);
      expect(tipos).toEqual(['LineString', 'Point']);
      expect(mapa().fuentes.hoyo.data.features[0].geometry.coordinates[0]).toEqual([-5.33, 36.28]);
    });

    it('H2/H3: delante, centro y fondo desde mi posición, y cambian al moverme', () => {
      abrir();

      act(() => gps.exito(lectura(36.2888, -5.332)));
      expect(screen.getByTestId('distancia-delante')).toHaveTextContent('111');
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('133');
      expect(screen.getByTestId('distancia-fondo')).toHaveTextContent('156');

      act(() => gps.exito(lectura(36.2893, -5.332)));
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('78');
    });

    it('L3: el lector de pantalla lee las distancias como una frase', () => {
      abrir();
      act(() => gps.exito(lectura(36.2888, -5.332)));

      expect(screen.getByText('mapa.etiqueta {"front":111,"center":133,"back":156}')).toHaveClass('sr-only');
    });

    it('H4: «Ver hoyo» vuelve a encuadrar el hoyo entero', () => {
      abrir();
      mapa().fitBounds.mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'mapa.verHoyo' }));

      expect(mapa().fitBounds).toHaveBeenCalledWith(limitesDelHoyo(HOYO), expect.objectContaining({ bearing: expect.any(Number) }));
      expect(screen.queryByRole('button', { name: 'mapa.norte' })).toBeNull();
    });

    it('H5: «Céntrame» lleva el mapa a mi posición; sin posición, desactivado', () => {
      abrir();
      expect(screen.getByRole('button', { name: 'mapa.centrame' })).toBeDisabled();

      act(() => gps.exito(lectura(36.2888, -5.332)));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.centrame' }));

      expect(mapa().easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-5.332, 36.2888] }));
    });

    it('H6: un hoyo sin green dibuja su línea pero sin recuadro de distancias', () => {
      abrir({ hoyo: SIN_GREEN });
      act(() => mapa().oyentes.load());
      act(() => gps.exito(lectura(36.2888, -5.332)));

      expect(mapa().fuentes.hoyo.data.features.map((f) => f.geometry.type)).toEqual(['LineString']);
      expect(screen.queryByTestId('distancia-centro')).toBeNull();
    });

    it('una línea de juego de un solo punto no se dibuja (no es una línea)', () => {
      abrir({ hoyo: { playLine: [GREEN.center], green: GREEN } });
      act(() => mapa().oyentes.load());

      expect(mapa().fuentes.hoyo.data.features.map((f) => f.geometry.type)).toEqual(['Point']);
    });

    it('un green sin línea de juego da distancias igual (norte arriba)', () => {
      abrir({ hoyo: { playLine: [], green: GREEN } });
      act(() => gps.exito(lectura(36.2888, -5.332)));

      expect(mapa().opciones.bearing).toBe(0);
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('133');
    });

    it('un hoyo con mapa no necesita dónde centrarse', () => {
      abrir();

      expect(centro.args).toEqual({ golfCourseId: 'gc-1', activo: false });
    });
  });

  describe('hoyo sin mapa', () => {
    it('S1/S2: norte arriba y se puede girar; «Norte» lo devuelve', () => {
      abrir({ hoyo: null });

      expect(mapa().opciones.bearing).toBe(0);
      expect(mapa().opciones.dragRotate).toBe(true);
      expect(mapa().touchZoomRotate.disableRotation).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'mapa.norte' }));

      expect(mapa().resetNorth).toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'mapa.verHoyo' })).toBeNull();
    });

    it('S1: se centra en mi posición en cuanto llega, una vez', () => {
      abrir({ hoyo: null });

      act(() => gps.exito(lectura(36.2888, -5.332)));
      act(() => gps.exito(lectura(36.2889, -5.332)));

      expect(mapa().jumpTo).toHaveBeenCalledTimes(1);
      expect(mapa().jumpTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-5.332, 36.2888] }));
    });

    it('S3: sin GPS todavía, se abre en el campo (o la última posición)', () => {
      centro.valor = { lat: 36.29, lon: -5.33 };

      abrir({ hoyo: null });

      expect(centro.args).toEqual({ golfCourseId: 'gc-1', activo: true });
      expect(mapa().opciones.center).toEqual([-5.33, 36.29]);
    });

    it('S4: sin recuadro de distancias', () => {
      abrir({ hoyo: null });
      act(() => gps.exito(lectura(36.2888, -5.332)));

      expect(screen.queryByTestId('distancia-centro')).toBeNull();
    });
  });

  describe('medir tocando', () => {
    const tocar = (lat, lon) => act(() => mapa().oyentes.click({ lngLat: { lat, lng: lon } }));

    it('M2: hasta ahí y de ahí al centro del green', () => {
      abrir();
      act(() => gps.exito(lectura(36.2888, -5.332)));

      tocar(36.2893, -5.332);

      expect(screen.getByText('mapa.hastaAhi {"metros":56}')).toBeInTheDocument();
      expect(screen.getByText('mapa.deAhiAlGreen {"metros":78}')).toBeInTheDocument();
    });

    it('M2: sin green, solo hasta ahí', () => {
      abrir({ hoyo: null });
      act(() => gps.exito(lectura(36.2888, -5.332)));

      tocar(36.2893, -5.332);

      expect(screen.getByText('mapa.hastaAhi {"metros":56}')).toBeInTheDocument();
      expect(screen.queryByText(/mapa.deAhiAlGreen/)).toBeNull();
    });

    it('G2: sin posición (ubicación no permitida) se mide igual de ahí al green', () => {
      abrir();
      act(() => gps.error({ code: 1 }));

      tocar(36.2893, -5.332);

      expect(screen.getByText('mapa.denegado')).toBeInTheDocument();
      expect(screen.getByText('mapa.deAhiAlGreen {"metros":78}')).toBeInTheDocument();
      expect(screen.queryByText(/mapa.hastaAhi/)).toBeNull();
    });

    it('M2: en un hoyo sin green, solo hasta ahí', () => {
      abrir({ hoyo: SIN_GREEN });
      act(() => gps.exito(lectura(36.2888, -5.332)));

      tocar(36.2893, -5.332);

      expect(screen.getByText('mapa.hastaAhi {"metros":56}')).toBeInTheDocument();
      expect(screen.queryByText(/mapa.deAhiAlGreen/)).toBeNull();
    });

    it('M3: otro toque mueve el punto, y «Quitar» lo quita', () => {
      abrir();
      act(() => gps.exito(lectura(36.2888, -5.332)));
      tocar(36.2893, -5.332);

      tocar(36.2898, -5.332);
      expect(screen.getByText('mapa.hastaAhi {"metros":111}')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));
      expect(screen.queryByText(/mapa.hastaAhi/)).toBeNull();
      expect(screen.getByText('mapa.ayudaMedir')).toBeInTheDocument();
    });
  });

  describe('GPS', () => {
    it('G1: con precisión peor de 30 m, «Buscando señal», sin distancias', () => {
      abrir();

      act(() => gps.exito(lectura(36.2888, -5.332, 50)));

      expect(screen.getByText('mapa.buscando')).toBeInTheDocument();
      expect(screen.queryByTestId('distancia-centro')).toBeNull();
    });

    it('G3: sin GPS en el navegador, el aviso', () => {
      vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: undefined });

      abrir();

      expect(screen.getByText('mapa.noDisponible')).toBeInTheDocument();
    });

    it('una posición buena se recuerda para la próxima vez sin señal', () => {
      abrir();

      act(() => gps.exito(lectura(36.2888, -5.332)));

      expect(centro.recordada).toEqual({ lat: 36.2888, lon: -5.332 });
    });
  });

  describe('licencias y tamaño', () => {
    it('L2: «PNOA © IGN» siempre; «© OSM» como enlace a su licencia si el mapa es de OSM', () => {
      abrir({ atribucion: '© OpenStreetMap contributors (ODbL)' });

      expect(screen.getByText('PNOA © IGN')).toBeInTheDocument();
      const osm = screen.getByRole('link', { name: '© OSM' });
      expect(osm).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
      expect(osm).toHaveAttribute('target', '_blank');
      expect(osm).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('L2: sin OSM, sin su enlace', () => {
      abrir({ hoyo: null, atribucion: null });

      expect(screen.queryByRole('link', { name: '© OSM' })).toBeNull();
    });

    it('L4: los botones miden al menos 44 px', () => {
      abrir();

      for (const nombre of ['mapa.cerrar', 'mapa.centrame', 'mapa.verHoyo']) {
        expect(screen.getByRole('button', { name: nombre })).toHaveClass('min-h-11');
      }
    });
  });
});

describe('MapaDelHoyo — tras la revisión', () => {
  let gps;

  beforeEach(() => {
    mapas.length = 0;
    mapas.marcas = [];
    centro.valor = null;
    centro.veces = 0;
    gps = gpsFalso();
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gps });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('S3: la ubicación del campo que llega después centra el mapa, una vez', () => {
    const { rerender } = abrir({ hoyo: null });
    expect(mapa().jumpTo).not.toHaveBeenCalled();

    centro.valor = { lat: 36.29, lon: -5.33 };
    rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={null} atribucion={null} onCerrar={() => {}} />);

    expect(mapa().jumpTo).toHaveBeenCalledTimes(1);
    expect(mapa().jumpTo).toHaveBeenCalledWith(expect.objectContaining({ center: [-5.33, 36.29] }));
  });

  it('un hoyo con mapa no salta a una posición guardada: va encuadrado', () => {
    const { rerender } = abrir();

    centro.valor = { lat: 40.4, lon: -3.7 };
    rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={HOYO} atribucion={null} onCerrar={() => {}} />);

    expect(mapa().jumpTo).not.toHaveBeenCalled();
  });

  it('S3: si el jugador ya movió el mapa, no se lo cambia', () => {
    const { rerender } = abrir({ hoyo: null });
    act(() => mapa().oyentes.movestart({ originalEvent: {} }));

    centro.valor = { lat: 36.29, lon: -5.33 };
    rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={null} atribucion={null} onCerrar={() => {}} />);

    expect(mapa().jumpTo).not.toHaveBeenCalled();
  });

  it('S3: con el GPS ya centrado, la del campo no lo mueve', () => {
    const { rerender } = abrir({ hoyo: null });
    act(() => gps.exito(lectura(36.2888, -5.332)));
    mapa().jumpTo.mockClear();

    centro.valor = { lat: 36.29, lon: -5.33 };
    rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={null} atribucion={null} onCerrar={() => {}} />);

    expect(mapa().jumpTo).not.toHaveBeenCalled();
  });

  it('el foco entra al mapa por «Cerrar»', () => {
    abrir();

    expect(screen.getByRole('button', { name: 'mapa.cerrar' })).toHaveFocus();
  });

  it('respeta las zonas seguras del iPhone (muesca y barra de inicio)', () => {
    abrir();

    expect(screen.getByTestId('mapa-arriba').className).toContain('env(safe-area-inset-top)');
    expect(screen.getByTestId('mapa-abajo').className).toContain('env(safe-area-inset-bottom)');
  });

  it('el margen del encuadre sale del alto de la pantalla (apaisado)', () => {
    const alto = vi.spyOn(globalThis.HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(360);
    try {
      abrir();
    } finally {
      alto.mockRestore();
    }

    expect(mapa().fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ padding: expect.objectContaining({ top: 54, bottom: 144 }) })
    );
  });

  it('sin señal buena, el punto azul se quita', () => {
    abrir();
    act(() => gps.exito(lectura(36.2888, -5.332)));
    const yo = mapas.marcas[0];

    act(() => gps.exito(lectura(36.2888, -5.332, 60)));

    expect(yo.remove).toHaveBeenCalled();
  });

  it('la última posición se guarda como mucho cada 30 s, no en cada lectura', () => {
    vi.useFakeTimers();
    abrir();

    act(() => gps.exito(lectura(36.2888, -5.332)));
    act(() => gps.exito(lectura(36.2889, -5.332)));
    expect(centro.veces).toBe(1);

    act(() => vi.advanceTimersByTime(30_000));
    act(() => gps.exito(lectura(36.289, -5.332)));
    expect(centro.veces).toBe(2);
  });
});
