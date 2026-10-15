import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { orientacionDelHoyo, limitesDelHoyo, rumbo } from '../../../domain/services/geometriaDelHoyo';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }),
}));

// MapLibre de mentira: guarda lo que se le pide para poder comprobarlo
const mapas = vi.hoisted(() => []);
vi.mock('maplibre-gl', () => {
  class Map {
    constructor(opciones) {
      if (mapas.sinWebgl) throw new Error('Failed to initialize WebGL');
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
      this.doubleClickZoom = { disable: vi.fn(), enable: vi.fn() };
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
    constructor(opciones = {}) {
      this.opciones = opciones;
      this.oyentes = {};
      this.remove = vi.fn(() => {
        this.quitada = true;
      });
      mapas.marcas = [...(mapas.marcas ?? []), this];
    }
    setLngLat(p) {
      this.p = p;
      return this;
    }
    getLngLat() {
      return { lng: this.p[0], lat: this.p[1] };
    }
    getElement() {
      return this.opciones.element;
    }
    on(evento, fn) {
      this.oyentes[evento] = fn;
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
}));

const { default: MapaDelHoyo } = await import('./MapaDelHoyo');
const leer = (ruta) => readFileSync(resolve(process.cwd(), ruta), 'utf8');
const indexCss = leer('src/index.css');
const mapaCss = leer('src/components/scoring/mapa/mapa.css');
const mapaJsx = leer('src/components/scoring/mapa/MapaDelHoyo.jsx');

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

    it('M2 (16 oct): en el mapa, una línea de ti al punto y otra del punto al green, con sus metros', () => {
      abrir();
      act(() => mapa().oyentes.load());
      act(() => gps.exito(lectura(36.2888, -5.332)));

      tocar(36.2893, -5.332);

      const lineas = mapa().fuentes.medida.data.features.map((f) => f.geometry.coordinates);
      expect(lineas).toEqual([
        [[-5.332, 36.2888], [-5.332, 36.2893]],
        [[-5.332, 36.2893], [-5.332, 36.29]],
      ]);
      const etiquetas = mapas.marcas.filter((m) => !m.quitada && /mapa\.tramo/.test(m.opciones.element?.textContent ?? ''));
      expect(etiquetas.map((m) => m.opciones.element.textContent)).toEqual(['mapa.tramo {"metros":56}', 'mapa.tramo {"metros":78}']);
      // Cada etiqueta, en mitad de su tramo
      expect(etiquetas[0].p[1]).toBeCloseTo((36.2888 + 36.2893) / 2, 9);
      // Ya no hay cuadro: los metros, para lectores de pantalla
      expect(screen.getByRole('status')).toHaveClass('sr-only');
    });

    it('M2: al moverte, la línea y su etiqueta te siguen sin rehacerse', () => {
      abrir();
      act(() => mapa().oyentes.load());
      act(() => gps.exito(lectura(36.2888, -5.332)));
      tocar(36.2893, -5.332);
      const antes = mapas.marcas.length;

      act(() => gps.exito(lectura(36.2885, -5.332)));

      expect(mapas.marcas.length).toBe(antes);
      expect(mapa().fuentes.medida.data.features[0].geometry.coordinates[0]).toEqual([-5.332, 36.2885]);
      expect(mapas.marcas.some((m) => !m.quitada && m.opciones.element?.textContent === 'mapa.tramo {"metros":89}')).toBe(true);
    });

    it('M3 (16 oct): al tocar, el mapa gira hacia el punto y os encuadra, contigo abajo', () => {
      abrir({ hoyo: null });
      act(() => gps.exito(lectura(36.2888, -5.332)));
      mapa().fitBounds.mockClear();

      tocar(36.2893, -5.3315);

      expect(mapa().fitBounds).toHaveBeenCalledTimes(1);
      const [limites, opciones] = mapa().fitBounds.mock.calls[0];
      expect(limites).toEqual([
        [-5.332, 36.2888],
        [-5.3315, 36.2893],
      ]);
      expect(opciones.bearing).toBeCloseTo(rumbo({ lat: 36.2888, lon: -5.332 }, { lat: 36.2893, lon: -5.3315 }), 6);
      expect(opciones.padding).toMatchObject({ top: expect.any(Number), bottom: expect.any(Number) });
    });

    it('M3: también en un hoyo con mapa (que no se gira con los dedos)', () => {
      abrir();
      act(() => gps.exito(lectura(36.2888, -5.332)));
      mapa().fitBounds.mockClear();

      tocar(36.2893, -5.332);

      expect(mapa().fitBounds.mock.calls[0][1].bearing).toBeCloseTo(0, 6);
    });

    it('M3: sin GPS no gira (no se sabe dónde estás)', () => {
      abrir({ hoyo: null });
      mapa().fitBounds.mockClear();

      tocar(36.2893, -5.3315);

      expect(mapa().fitBounds).not.toHaveBeenCalled();
    });

    it('M2: «Quitar» borra las líneas y sus metros', () => {
      abrir();
      act(() => mapa().oyentes.load());
      act(() => gps.exito(lectura(36.2888, -5.332)));
      tocar(36.2893, -5.332);

      fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));

      expect(mapa().fuentes.medida.data.features).toEqual([]);
      expect(mapas.marcas.filter((m) => !m.quitada && /mapa\.tramo/.test(m.opciones.element?.textContent ?? ''))).toEqual([]);
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

  });

  describe('licencias y tamaño', () => {
    it('L2: «PNOA © IGN» siempre; «© OSM» como enlace a su licencia si el mapa es de OSM', () => {
      abrir({ atribucion: '© OpenStreetMap contributors (ODbL)' });

      expect(screen.getByText('mapa.atribucionPnoa')).toBeInTheDocument();
      const osm = screen.getByRole('link', { name: 'mapa.atribucionOsm' });
      expect(osm).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
      expect(osm).toHaveAttribute('target', '_blank');
      expect(osm).toHaveAttribute('rel', expect.stringContaining('noopener'));
    });

    it('L2: sin OSM, sin su enlace', () => {
      abrir({ hoyo: null, atribucion: null });

      expect(screen.queryByRole('link', { name: 'mapa.atribucionOsm' })).toBeNull();
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

});

describe('MapaDelHoyo — tras /code-review', () => {
  let gps;

  beforeEach(() => {
    mapas.length = 0;
    mapas.sinWebgl = false;
    centro.valor = null;
    gps = gpsFalso();
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gps });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mapas.sinWebgl = false;
  });



  it('un móvil sin WebGL: sin mapa, pero con las distancias al green, que solo piden GPS', () => {
    mapas.sinWebgl = true;

    abrir();
    act(() => gps.exito(lectura(36.2888, -5.332)));

    expect(screen.getByText('mapa.sinMapaEnEsteMovil')).toBeInTheDocument();
    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('133');
    expect(screen.queryByRole('button', { name: 'mapa.verHoyo' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'mapa.centrame' })).toBeNull();
    expect(screen.queryByText('mapa.ayudaMedir')).toBeNull();
    expect(screen.getByRole('button', { name: 'mapa.cerrar' })).toBeInTheDocument();
  });
});

describe('MapaDelHoyo — marcar un hoyo sin datos (PR C)', () => {
  const M_POR_GRADO = (6371008.8 * Math.PI) / 180;
  const T = { lat: 36.28, lon: -5.33 };
  const alNorte = (m) => ({ lat: T.lat + m / M_POR_GRADO, lon: T.lon });
  const G = alNorte(300);
  const tocar = (p) => act(() => mapa().oyentes.click({ lngLat: { lat: p.lat, lng: p.lon } }));
  const vivas = () => mapas.marcas.filter((m) => !m.quitada);
  const arrastrables = () => vivas().filter((m) => m.opciones.draggable);
  const soltar = (marca, p) =>
    act(() => {
      marca.setLngLat([p.lon, p.lat]);
      marca.oyentes.dragend({ target: marca });
    });
  const datosDelMarcado = () => mapa().fuentes.marcado?.data;
  const tipos = () => (datosDelMarcado()?.features ?? []).map((f) => f.properties.tipo);
  const marcar = (props = {}) => {
    const onGuardarMarca = props.onGuardarMarca ?? vi.fn(async () => ({ estado: 'guardada' }));
    const r = abrir({ hoyo: null, porMarcar: 'salida', onGuardarMarca, ...props });
    act(() => mapa().oyentes.load());
    return { ...r, onGuardarMarca };
  };

  beforeEach(() => {
    mapas.length = 0;
    mapas.marcas = [];
    mapas.sinWebgl = false;
    centro.valor = null;
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gpsFalso() });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('C1: sin datos, pide la salida, con «Ahora no»', () => {
    marcar();

    expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'mapa.ahoraNo' })).toBeInTheDocument();
    expect(screen.queryByText('mapa.ayudaMedir')).toBeNull();
  });

  it('C4/C6: el toque marca la salida (no mide) y aparece el arco con los metros de la tarjeta', () => {
    marcar({ metros: 142 });

    tocar(T);

    expect(screen.queryByText(/mapa\.hastaAhi/)).toBeNull();
    expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
    expect(tipos()).toEqual(['arco']);
    const arco = datosDelMarcado().features[0].geometry.coordinates;
    expect(arco[0]).toEqual(arco.at(-1));
    expect(vivas().some((m) => m.opciones.element?.textContent === 'mapa.arco {"metros":142}')).toBe(true);
  });

  it('C7: sin metros en la tarjeta, ni arco', () => {
    marcar({ metros: null });

    tocar(T);

    expect(tipos()).toEqual([]);
  });

  it('C8: al tocar el green sale la recta con un punto arrastrable en medio, y «Guardar»/«Volver a marcar»', () => {
    marcar({ metros: 300 });
    tocar(T);

    tocar(G);

    expect(tipos()).toEqual(['linea', 'arco']);
    expect(datosDelMarcado().features[0].geometry.coordinates).toEqual([
      [T.lon, T.lat],
      [G.lon, G.lat],
    ]);
    expect(arrastrables()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'mapa.guardarMarca' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'mapa.volverAMarcar' })).toBeInTheDocument();
    expect(screen.getByText('mapa.ayudaCodo')).toBeInTheDocument();
  });

  it('C9: soltar el punto forma un codo; con dos codos no salen más puntos', () => {
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);
    const codo1 = { lat: 36.281, lon: -5.331 };

    soltar(arrastrables()[0], codo1);

    expect(datosDelMarcado().features[0].geometry.coordinates).toHaveLength(3);
    // El codo (que se puede volver a mover) y un punto en cada tramo
    expect(arrastrables()).toHaveLength(3);

    soltar(arrastrables().at(-1), { lat: 36.282, lon: -5.3315 });

    expect(datosDelMarcado().features[0].geometry.coordinates).toHaveLength(4);
    expect(arrastrables()).toHaveLength(2);
    expect(screen.queryByText('mapa.ayudaCodo')).toBeNull();
  });

  it('C9: un codo se puede volver a arrastrar', () => {
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);
    soltar(arrastrables()[0], { lat: 36.281, lon: -5.331 });
    const codo = arrastrables()[0];

    soltar(codo, { lat: 36.2812, lon: -5.3313 });

    expect(datosDelMarcado().features[0].geometry.coordinates[1]).toEqual([-5.3313, 36.2812]);
  });

  it('C4: mientras se ajusta la línea, un toque no mide ni mueve nada', () => {
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);

    tocar(alNorte(150));

    // Ni el punto amarillo de medir
    expect(vivas().some((m) => m.opciones.element?.className.includes('h-3.5'))).toBe(false);
    expect(datosDelMarcado().features[0].geometry.coordinates).toEqual([
      [T.lon, T.lat],
      [G.lon, G.lat],
    ]);
  });

  it('C9: con un codo, el punto del primer tramo entra ANTES de ese codo', () => {
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);
    const segundo = { lat: 36.2815, lon: -5.331 };
    soltar(arrastrables()[0], segundo);
    // Los arrastrables: el codo, y los puntos del primer y del segundo tramo
    const delPrimerTramo = arrastrables()[1];
    const primero = { lat: 36.2805, lon: -5.3302 };

    soltar(delPrimerTramo, primero);

    expect(datosDelMarcado().features[0].geometry.coordinates).toEqual([
      [T.lon, T.lat],
      [primero.lon, primero.lat],
      [segundo.lon, segundo.lat],
      [G.lon, G.lat],
    ]);
  });

  it('C11: «Volver a marcar» empieza de cero', () => {
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.volverAMarcar' }));

    expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
    expect(tipos()).toEqual([]);
  });

  it('C12: «Guardar» envía salida, codos y green', async () => {
    const { onGuardarMarca } = marcar({ metros: 300 });
    tocar(T);
    tocar(G);
    const codo = { lat: 36.281, lon: -5.331 };
    soltar(arrastrables()[0], codo);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' })));

    expect(onGuardarMarca).toHaveBeenCalledWith({ tee: T, bends: [codo], greenCenter: G });
  });

  it('C13: si la línea se aparta más de un 25 % de la tarjeta, se pregunta', async () => {
    const { onGuardarMarca } = marcar({ metros: 142 });
    tocar(T);
    tocar(G);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' }));

    expect(onGuardarMarca).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('mapa.avisoTarjeta {"tipo":"tarjeta","marcado":300,"tarjeta":142}');

    fireEvent.click(screen.getByRole('button', { name: 'mapa.corregir' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'mapa.guardarMarca' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'mapa.siGuardar' })));
    expect(onGuardarMarca).toHaveBeenCalledTimes(1);
  });

  it('C13: dentro del 25 %, guarda sin preguntar', async () => {
    const { onGuardarMarca } = marcar({ metros: 280 });
    tocar(T);
    tocar(G);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' })));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onGuardarMarca).toHaveBeenCalledTimes(1);
  });

  it('la salida y el green a menos de 40 m no se guardan: se dice por qué', () => {
    const { onGuardarMarca } = marcar();
    tocar(T);
    tocar(alNorte(20));

    fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' }));

    expect(onGuardarMarca).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('mapa.fueraDeLimites');
  });

  it('si el servidor la rechaza, el mapa no lo dice (lo dice la ventana) y se puede volver a guardar', async () => {
    marcar({ onGuardarMarca: vi.fn(async () => ({ estado: 'rechazada', errorCode: 'HOLE_ALREADY_MAPPED' })) });
    tocar(T);
    tocar(G);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' })));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'mapa.guardarMarca' })).not.toBeDisabled();
  });

  it('si guardar no rehace el mapa (resultado raro), «Guardar» no se queda bloqueado', async () => {
    marcar({ onGuardarMarca: vi.fn(async () => undefined) });
    tocar(T);
    tocar(G);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' })));

    expect(screen.getByRole('button', { name: 'mapa.guardarMarca' })).not.toBeDisabled();
  });

  it('mientras guarda, «Guardar» no se puede pulsar dos veces', async () => {
    let terminar;
    const { onGuardarMarca } = marcar({ onGuardarMarca: vi.fn(() => new Promise((r) => (terminar = r))) });
    tocar(T);
    tocar(G);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' })));

    expect(screen.getByRole('button', { name: 'mapa.guardarMarca' })).toBeDisabled();
    await act(async () => terminar({ estado: 'guardada' }));
    expect(onGuardarMarca).toHaveBeenCalledTimes(1);
  });

  it('mientras se marca, el doble toque no acerca el mapa (marcaría salida y green juntos)', () => {
    marcar();

    expect(mapa().doubleClickZoom.disable).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'mapa.ahoraNo' }));
    expect(mapa().doubleClickZoom.enable).toHaveBeenCalled();
  });

  it('C3/C16: volviendo a marcar, «Ahora no» devuelve la marca que había', () => {
    const onAhoraNo = vi.fn();
    marcar({ onAhoraNo });

    fireEvent.click(screen.getByRole('button', { name: 'mapa.ahoraNo' }));

    expect(onAhoraNo).toHaveBeenCalled();
    expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
  });

  it('el aviso de la tarjeta lleva el foco a «Corregir» y se describe con su texto', () => {
    marcar({ metros: 142 });
    tocar(T);
    tocar(G);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' }));

    expect(screen.getByRole('button', { name: 'mapa.corregir' })).toHaveFocus();
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(/mapa\.avisoTarjeta/);
  });

  it('si guardar revienta, también se avisa', async () => {
    marcar({ onGuardarMarca: vi.fn(async () => { throw new Error('x'); }) });
    tocar(T);
    tocar(G);

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' })));

    expect(screen.getByRole('alert')).toHaveTextContent('mapa.noSeGuardo');
  });

  it('C3: «Ahora no» deja medir como siempre, y «Marcar hoyo» vuelve a pedirlo', () => {
    marcar({ metros: 142 });
    tocar(T);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.ahoraNo' }));

    expect(screen.getByText('mapa.ayudaMedir')).toBeInTheDocument();
    expect(tipos()).toEqual([]);
    tocar(G);
    expect(screen.queryByText('mapa.pideGreen')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'mapa.marcarHoyo' }));
    expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
  });

  it('C2: con la salida en el mapa, solo se pide el green, sin codos, y se mide desde esa salida', async () => {
    const conSalida = { playLine: [T, alNorte(280)], green: null };
    const { onGuardarMarca } = marcar({ hoyo: conSalida, porMarcar: 'green', metros: 300 });

    expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
    tocar(G);

    expect(arrastrables()).toHaveLength(0);
    expect(screen.queryByText('mapa.ayudaCodo')).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' })));
    expect(onGuardarMarca).toHaveBeenCalledWith({ tee: null, bends: [], greenCenter: G });
  });

  it('C16: en un hoyo marcado por el jugador, «Volver a marcar»', () => {
    const onVolverAMarcar = vi.fn();
    abrir({ hoyo: { playLine: [T, G], green: { front: alNorte(290), center: G, back: alNorte(310) }, marcadoPorMi: true }, onVolverAMarcar });

    fireEvent.click(screen.getByRole('button', { name: 'mapa.volverAMarcar' }));

    expect(onVolverAMarcar).toHaveBeenCalled();
  });

  it('sin `porMarcar` (hoyo completo), no se pide nada', () => {
    abrir();

    expect(screen.queryByText('mapa.pideSalida')).toBeNull();
    expect(screen.queryByRole('button', { name: 'mapa.volverAMarcar' })).toBeNull();
  });
});

describe('MapaDelHoyo — tras la prueba en el Kind', () => {
  beforeEach(() => {
    mapas.length = 0;
    mapas.marcas = [];
    mapas.sinWebgl = false;
    centro.valor = null;
  });

  it('la hoja de MapLibre va en su capa, por debajo de las utilidades de Tailwind', () => {
    // Sin capa ganaba a todas las utilidades: `.maplibregl-map { position: relative;
    // overflow: hidden }` pisaba el `absolute inset-0` del contenedor, que se quedaba
    // con 0 de alto y recortaba el lienzo (en el build, el mapa salía gris)
    const orden = indexCss.match(/@layer ([a-z, ]+);/)[1].split(/,\s*/);
    expect(orden.indexOf('maplibre')).toBeGreaterThan(-1);
    expect(orden.indexOf('maplibre')).toBeLessThan(orden.indexOf('utilities'));
    expect(indexCss.indexOf('@layer theme')).toBeLessThan(indexCss.indexOf('@import "tailwindcss"'));
    expect(mapaCss).toMatch(/@import 'maplibre-gl\/dist\/maplibre-gl\.css' layer\(maplibre\);/);
    // Y nadie la importa sin capa
    expect(mapaJsx).toContain("import './mapa.css';");
    expect(mapaJsx).not.toContain('maplibre-gl.css');
  });
});
