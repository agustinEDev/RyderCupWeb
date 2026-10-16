import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
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
      this.getBearing = vi.fn(() => 0);
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
    setOffset(o) {
      this.offset = o;
      return this;
    }
    addTo(mapa) {
      this.mapa = mapa;
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

    // Agustín, 16 oct: el recuadro es fijo, con los metros oficiales desde la salida
    it('R1/R6: delante, centro y fondo con la tarjeta y el green dibujado, y no cambian al moverme', () => {
      abrir({ metros: 342 });
      // El green del hoyo: 22 m del centro a delante y al fondo
      expect(screen.getByTestId('distancia-delante')).toHaveTextContent('320');
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
      expect(screen.getByTestId('distancia-fondo')).toHaveTextContent('364');

      act(() => gps.exito(lectura(36.2888, -5.332)));
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
      act(() => gps.exito(lectura(36.2893, -5.332)));
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
    });

    it('R4: sin metros en la tarjeta, medido en el mapa desde la salida, siguiendo el codo', () => {
      abrir({ metros: null });

      // Salida → codo (563 m) → centro del green (563 m); delante, del codo a 541 m
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('1126');
      expect(screen.getByTestId('distancia-delante')).toHaveTextContent('1104');
    });

    it('R6: sin GPS, el recuadro está igual', () => {
      abrir({ metros: 342 });
      act(() => gps.error({ code: 1 }));

      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
    });

    it('R10: el lector de pantalla lee las distancias como una frase', () => {
      abrir({ metros: 342 });

      expect(screen.getByText('mapa.etiqueta {"front":320,"center":342,"back":364}')).toHaveClass('sr-only');
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

    it('un green sin línea de juego: con la tarjeta, recuadro (norte arriba); sin ella, no', () => {
      const { unmount } = abrir({ hoyo: { playLine: [], green: GREEN }, metros: 342 });
      expect(mapa().opciones.bearing).toBe(0);
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
      unmount();

      abrir({ hoyo: { playLine: [], green: GREEN }, metros: null });
      expect(screen.queryByTestId('distancia-centro')).toBeNull();
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
      const etiquetas = mapas.marcas.filter((m) => !m.quitada && m.opciones.element?.dataset?.tramo === 'medida' && /mapa\.tramo/.test(m.opciones.element?.textContent ?? ''));
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
      expect(mapas.marcas.filter((m) => !m.quitada && m.opciones.element?.dataset?.tramo === 'medida' && /mapa\.tramo/.test(m.opciones.element?.textContent ?? ''))).toEqual([]);
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
    it('G1: con precisión peor de 30 m, «Buscando señal»; el recuadro, fijo, sigue', () => {
      abrir({ metros: 342 });

      act(() => gps.exito(lectura(36.2888, -5.332, 50)));

      expect(screen.getByText('mapa.buscando')).toBeInTheDocument();
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
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

  it('en un móvil normal (780 px) se reserva abajo el sitio de los paneles: la salida no queda tapada', () => {
    const alto = vi.spyOn(globalThis.HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(780);
    try {
      abrir();
    } finally {
      alto.mockRestore();
    }

    expect(mapa().fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ padding: expect.objectContaining({ top: 90, bottom: 320 }) })
    );
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
      expect.objectContaining({ padding: expect.objectContaining({ top: 54, bottom: 162 }) })
    );
  });

  it('sin señal buena, el punto azul se quita', () => {
    abrir();
    act(() => gps.exito(lectura(36.2888, -5.332)));
    // El punto azul (antes van las cifras de la línea del hoyo)
    const yo = mapas.marcas.find((m) => m.opciones.element?.className.includes('bg-blue-500'));

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



  it('un móvil sin WebGL: sin mapa, pero con el recuadro de la tarjeta', () => {
    mapas.sinWebgl = true;

    abrir({ metros: 342 });

    expect(screen.getByText('mapa.sinMapaEnEsteMovil')).toBeInTheDocument();
    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
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

  let reloj;
  beforeEach(() => {
    mapas.length = 0;
    mapas.marcas = [];
    mapas.sinWebgl = false;
    centro.valor = null;
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gpsFalso() });
    // Un segundo entre toque y toque: así no cuentan como doble toque
    let ahora = 0;
    reloj = vi.spyOn(globalThis.performance, 'now').mockImplementation(() => (ahora += 1000));
  });

  afterEach(() => {
    reloj.mockRestore();
    vi.unstubAllGlobals();
  });

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

  it('par 5 (16 oct): la recta lleva dos puntos para arrastrar; soltar uno hace el codo', () => {
    marcar({ par: 5, metros: 300 });
    tocar(T);
    tocar(G);

    expect(arrastrables()).toHaveLength(2);
    soltar(arrastrables()[1], { lat: 36.282, lon: -5.331 });
    expect(datosDelMarcado().features[0].geometry.coordinates).toHaveLength(3);
  });

  it('C6: al tocar la salida, el mapa se aleja (sin girar) para enseñar el arco entero', () => {
    marcar({ metros: 390 });
    mapa().fitBounds.mockClear();
    mapa().getBearing.mockReturnValue(25);

    tocar(T);

    expect(mapa().fitBounds).toHaveBeenCalledTimes(1);
    const [[[oeste, sur], [este, norte]], opciones] = mapa().fitBounds.mock.calls[0];
    expect(norte - T.lat).toBeCloseTo(390 / M_POR_GRADO, 5);
    expect(T.lat - sur).toBeCloseTo(390 / M_POR_GRADO, 5);
    expect(este).toBeGreaterThan(T.lon);
    expect(oeste).toBeLessThan(T.lon);
    expect(opciones.bearing).toBe(25);
  });

  it('C6/C7: sin metros de la tarjeta, al tocar la salida el mapa no se mueve', () => {
    marcar({ metros: null });
    mapa().fitBounds.mockClear();

    tocar(T);

    expect(mapa().fitBounds).not.toHaveBeenCalled();
  });

  it('C23: el doble toque (dos toques seguidos) no marca salida y green en el mismo sitio', () => {
    marcar();

    reloj.mockReturnValue(1000);
    tocar(T);
    reloj.mockReturnValue(1150);
    tocar(T);

    expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
    reloj.mockReturnValue(1600);
    tocar(G);
    expect(screen.getByRole('button', { name: 'mapa.guardarMarca' })).toBeInTheDocument();
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

describe('MapaDelHoyo — lejos del campo (16 oct)', () => {
  let gps;
  const CAMPO = { lat: 36.29, lon: -5.33 };
  const EN_CASA = { lat: 36.72, lon: -4.42 }; // ~95 km
  const CERCA = { lat: 36.291, lon: -5.331 };
  const tocar = (lat, lon) => act(() => mapa().oyentes.click({ lngLat: { lat, lng: lon } }));

  beforeEach(() => {
    mapas.length = 0;
    mapas.marcas = [];
    mapas.sinWebgl = false;
    centro.valor = null;
    gps = gpsFalso();
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gps });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('sin mapa, con el GPS a kilómetros del campo, el mapa se queda en el campo', () => {
    centro.valor = CAMPO;
    abrir({ hoyo: null });
    mapa().jumpTo.mockClear();

    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));

    expect(mapa().opciones.center).toEqual([CAMPO.lon, CAMPO.lat]);
    expect(mapa().jumpTo).not.toHaveBeenCalled();
  });

  it('si el GPS (lejos) llegó antes que la ubicación del campo, al llegar esta vuelve al campo', () => {
    const { rerender } = abrir({ hoyo: null });
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    expect(mapa().jumpTo).toHaveBeenLastCalledWith({ center: [EN_CASA.lon, EN_CASA.lat], zoom: 17 });

    centro.valor = CAMPO;
    rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={null} atribucion={null} onCerrar={() => {}} />);

    expect(mapa().jumpTo).toHaveBeenLastCalledWith({ center: [CAMPO.lon, CAMPO.lat], zoom: 17 });
  });

  it('cerca del campo (menos de 3 km), el mapa va a ti como siempre', () => {
    centro.valor = CAMPO;
    abrir({ hoyo: null });

    act(() => gps.exito(lectura(CERCA.lat, CERCA.lon)));

    expect(mapa().jumpTo).toHaveBeenLastCalledWith({ center: [CERCA.lon, CERCA.lat], zoom: 17 });
  });

  it('lejos, medir tocando: sin línea desde ti ni giro; queda la del punto al green', () => {
    abrir();
    act(() => mapa().oyentes.load());
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    mapa().fitBounds.mockClear();

    tocar(36.2893, -5.332);

    expect(mapa().fitBounds).not.toHaveBeenCalled();
    expect(mapa().fuentes.medida.data.features.map((f) => f.geometry.coordinates)).toEqual([
      [[-5.332, 36.2893], [-5.332, 36.29]],
    ]);
    expect(screen.queryByText(/mapa\.hastaAhi/)).toBeNull();
    expect(screen.getByText('mapa.deAhiAlGreen {"metros":78}')).toBeInTheDocument();
  });

  it('con mapa, lo de lejos se mide desde la salida del hoyo: a menos de 3 km de ella, se mide desde ti', () => {
    abrir();
    act(() => mapa().oyentes.load());
    act(() => gps.exito(lectura(36.2888, -5.332)));
    mapa().fitBounds.mockClear();

    tocar(36.2893, -5.332);

    expect(mapa().fuentes.medida.data.features).toHaveLength(2);
    expect(mapa().fitBounds).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/mapa\.hastaAhi/)).toBeInTheDocument();
  });

  it('sin mapa y lejos (el caso del iPhone): medir no traza la línea desde ti ni gira', () => {
    centro.valor = CAMPO;
    abrir({ hoyo: null });
    act(() => mapa().oyentes.load());
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    mapa().fitBounds.mockClear();

    tocar(36.2893, -5.332);

    expect(mapa().fitBounds).not.toHaveBeenCalled();
    expect(mapa().fuentes.medida.data.features).toEqual([]);
    expect(screen.queryByText(/mapa\.hastaAhi/)).toBeNull();
  });

  it('un hoyo con solo la salida, sin ubicación del campo, se abre en esa salida', () => {
    abrir({ hoyo: { playLine: [{ lat: 36.28, lon: -5.33 }], green: null } });

    expect(mapa().opciones.center).toEqual([-5.33, 36.28]);
    expect(mapa().opciones.zoom).toBe(17);
  });

  it('un hoyo con solo la salida se mide desde ella, aunque no se sepa dónde está el campo', () => {
    abrir({ hoyo: { playLine: [{ lat: 36.28, lon: -5.33 }], green: null } });
    act(() => mapa().oyentes.load());
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    mapa().fitBounds.mockClear();

    tocar(36.2893, -5.332);

    expect(mapa().fitBounds).not.toHaveBeenCalled();
  });

  it('cruzar el límite con el mapa abierto: al acercarte vuelve la línea desde ti; al alejarte se va', () => {
    abrir();
    act(() => mapa().oyentes.load());
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    tocar(36.2893, -5.332);
    expect(mapa().fuentes.medida.data.features).toHaveLength(1);

    act(() => gps.exito(lectura(36.2888, -5.332)));
    expect(mapa().fuentes.medida.data.features).toHaveLength(2);
    expect(screen.getByText(/mapa\.hastaAhi/)).toBeInTheDocument();

    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    expect(mapa().fuentes.medida.data.features).toHaveLength(1);
    expect(screen.queryByText(/mapa\.hastaAhi/)).toBeNull();
  });

  it('con el mapa ya en ti cerca del campo, si luego te alejas no salta solo al campo', () => {
    const { rerender } = abrir({ hoyo: null });
    act(() => gps.exito(lectura(CERCA.lat, CERCA.lon)));
    centro.valor = CAMPO;
    rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={null} atribucion={null} onCerrar={() => {}} />);
    mapa().jumpTo.mockClear();

    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));

    expect(mapa().jumpTo).not.toHaveBeenCalled();
  });

  it('si el mapa volvió al campo porque estabas lejos, al llegar al campo va a ti', () => {
    const { rerender } = abrir({ hoyo: null });
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    centro.valor = CAMPO;
    rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={null} atribucion={null} onCerrar={() => {}} />);
    mapa().jumpTo.mockClear();

    act(() => gps.exito(lectura(CERCA.lat, CERCA.lon)));

    expect(mapa().jumpTo).toHaveBeenLastCalledWith({ center: [CERCA.lon, CERCA.lat], zoom: 17 });
  });

  it('lejos, «Céntrame» sin poder pulsarse y el recuadro igual; cerca, los dos', () => {
    abrir({ metros: 342 });
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));

    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
    expect(screen.getByRole('button', { name: 'mapa.centrame' })).toBeDisabled();

    act(() => gps.exito(lectura(36.2888, -5.332)));
    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
    expect(screen.getByRole('button', { name: 'mapa.centrame' })).not.toBeDisabled();
  });

  it('si moviste el mapa a mano estando lejos, al llegar al campo el GPS no te lo quita', () => {
    centro.valor = CAMPO;
    abrir({ hoyo: null });
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    act(() => mapa().oyentes.movestart({ originalEvent: {} }));
    mapa().jumpTo.mockClear();

    act(() => gps.exito(lectura(CERCA.lat, CERCA.lon)));

    expect(mapa().jumpTo).not.toHaveBeenCalled();
  });

  it('si moviste el mapa a mano tras saltar a tu casa, al llegar la ubicación del campo no vuelve', () => {
    const { rerender } = abrir({ hoyo: null });
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    act(() => mapa().oyentes.movestart({ originalEvent: {} }));
    mapa().jumpTo.mockClear();

    centro.valor = CAMPO;
    rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={null} atribucion={null} onCerrar={() => {}} />);

    expect(mapa().jumpTo).not.toHaveBeenCalled();
  });

  it('sin saber dónde está el campo (sin mapa y sin su ubicación), se da por hecho que estás en él', () => {
    abrir({ hoyo: null });
    act(() => mapa().oyentes.load());
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    mapa().fitBounds.mockClear();

    tocar(EN_CASA.lat + 0.001, EN_CASA.lon);

    expect(mapa().fitBounds).toHaveBeenCalledTimes(1);
  });
});

// Agustín, 16 oct: los metros, siempre que se pinta una línea; la longitud
// del hoyo (el aviso de la tarjeta) sigue los codos, como la medida oficial
describe('MapaDelHoyo — metros en cada tramo de la línea', () => {
  const M_POR_GRADO = (6371008.8 * Math.PI) / 180;
  const T = { lat: 36.28, lon: -5.33 };
  const alNorte = (m, de = T) => ({ lat: de.lat + m / M_POR_GRADO, lon: de.lon });
  const G = alNorte(300);
  const tocar = (p) => act(() => mapa().oyentes.click({ lngLat: { lat: p.lat, lng: p.lon } }));
  const vivas = () => mapas.marcas.filter((m) => !m.quitada);
  const arrastrables = () => vivas().filter((m) => m.opciones.draggable);
  const soltar = (marca, p) =>
    act(() => {
      marca.setLngLat([p.lon, p.lat]);
      marca.oyentes.dragend({ target: marca });
    });
  const deLaLinea = () => vivas().filter((m) => m.opciones.element?.dataset?.tramo === 'linea');
  const textos = () => deLaLinea().map((m) => m.opciones.element.textContent);
  const marcar = (props = {}) => {
    const r = abrir({ hoyo: null, porMarcar: 'salida', onGuardarMarca: vi.fn(async () => ({ estado: 'guardada' })), ...props });
    act(() => mapa().oyentes.load());
    return r;
  };
  let gps;
  let reloj;
  beforeEach(() => {
    mapas.length = 0;
    mapas.marcas = [];
    mapas.sinWebgl = false;
    centro.valor = null;
    gps = gpsFalso();
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gps });
    let ahora = 0;
    reloj = vi.spyOn(globalThis.performance, 'now').mockImplementation(() => (ahora += 1000));
  });
  afterEach(() => {
    reloj.mockRestore();
    vi.unstubAllGlobals();
  });

  it('R3: un hoyo sin datos, antes y mientras se marca, lleva el recuadro de la tarjeta ±10', () => {
    marcar({ metros: 300 });
    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('300');

    tocar(T);
    tocar(G);

    expect(screen.getByTestId('distancia-delante')).toHaveTextContent('290');
    expect(screen.getByTestId('distancia-fondo')).toHaveTextContent('310');
  });

  it('L1: con solo la salida marcada no hay línea, ni metros (queda el arco de la tarjeta)', () => {
    marcar({ metros: 300 });

    tocar(T);

    expect(textos()).toEqual([]);
    expect(vivas().some((m) => m.opciones.element?.textContent === 'mapa.arco {"metros":300}')).toBe(true);
  });

  it('L2: con salida y green, la recta lleva sus metros en medio', () => {
    marcar({ metros: 300 });
    tocar(T);

    tocar(G);

    expect(textos()).toEqual(['mapa.tramo {"metros":300}']);
    expect(deLaLinea()[0].p[1]).toBeCloseTo((T.lat + G.lat) / 2, 9);
  });

  it('L3: al soltar un codo, cada tramo con los suyos; al moverlo, se rehacen', () => {
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);

    soltar(arrastrables()[0], alNorte(100));
    expect(textos()).toEqual(['mapa.tramo {"metros":100}', 'mapa.tramo {"metros":200}']);

    soltar(arrastrables()[0], alNorte(120));
    expect(textos()).toEqual(['mapa.tramo {"metros":120}', 'mapa.tramo {"metros":180}']);
    // Y cada cifra se va a la mitad de su tramo nuevo
    expect(deLaLinea()[0].p[1]).toBeCloseTo((T.lat + alNorte(120).lat) / 2, 9);
  });

  it('L4: con dos codos (par 5), tres tramos y tres cifras', () => {
    marcar({ metros: 300, par: 5 });
    tocar(T);
    tocar(G);

    soltar(arrastrables()[0], alNorte(100));
    soltar(arrastrables().at(-1), alNorte(200));

    expect(textos()).toEqual(['mapa.tramo {"metros":100}', 'mapa.tramo {"metros":100}', 'mapa.tramo {"metros":100}']);
  });

  it('L5: «Volver a marcar» quita las cifras de la línea que había', () => {
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.volverAMarcar' }));

    expect(textos()).toEqual([]);
  });

  it('L6: solo el green, sobre la salida aprobada con su codo: cada tramo con sus metros', () => {
    const codo = alNorte(150);
    marcar({ hoyo: { playLine: [T, codo, alNorte(280)], green: null }, porMarcar: 'green', metros: 300 });

    tocar(G);

    expect(textos()).toEqual(['mapa.tramo {"metros":150}', 'mapa.tramo {"metros":150}']);
  });

  it('L7: un hoyo ya marcado, al abrirlo, lleva los metros de cada tramo', () => {
    abrir({ hoyo: { playLine: [T, alNorte(120), G], green: { front: alNorte(290), center: G, back: alNorte(310) }, marcadoPorMi: true } });
    act(() => mapa().oyentes.load());

    expect(textos()).toEqual(['mapa.tramo {"metros":120}', 'mapa.tramo {"metros":180}']);
  });

  it('L8: un hoyo del mapa aprobado, también', () => {
    abrir({ hoyo: { playLine: [T, G], green: { front: alNorte(290), center: G, back: alNorte(310) } } });
    act(() => mapa().oyentes.load());

    expect(textos()).toEqual(['mapa.tramo {"metros":300}']);
  });

  it('L9: lejos del campo, la línea marcada lleva sus metros igual', () => {
    marcar({ metros: 300 });
    act(() => gps.exito(lectura(40.4, -3.7)));
    tocar(T);

    tocar(G);

    expect(textos()).toEqual(['mapa.tramo {"metros":300}']);
  });

  it('L9: sin GPS, también', () => {
    abrir({ hoyo: { playLine: [T, G], green: { front: alNorte(290), center: G, back: alNorte(310) } } });
    act(() => mapa().oyentes.load());
    act(() => gps.error({ code: 1 }));

    expect(textos()).toEqual(['mapa.tramo {"metros":300}']);
  });

  it('L10: medir tocando no se mezcla: sus cifras van aparte de las de la línea', () => {
    abrir({ hoyo: { playLine: [T, G], green: { front: alNorte(290), center: G, back: alNorte(310) } } });
    act(() => mapa().oyentes.load());
    act(() => gps.exito(lectura(alNorte(50).lat, T.lon)));

    tocar(alNorte(150));

    expect(textos()).toEqual(['mapa.tramo {"metros":300}']);
    const medida = vivas().filter((m) => m.opciones.element?.dataset?.tramo === 'medida').map((m) => m.opciones.element.textContent);
    expect(medida).toEqual(['mapa.tramo {"metros":100}', 'mapa.tramo {"metros":150}']);
  });

  it('L11: un hoyo sin línea (solo el green, o nada) no pinta cifras', () => {
    abrir({ hoyo: { playLine: [T], green: null } });
    act(() => mapa().oyentes.load());

    expect(textos()).toEqual([]);
  });

  // Agustín, 16 oct: las cifras van en los tramos y se actualizan mientras se arrastra
  const arrastrar = (marca, p) =>
    act(() => {
      marca.setLngLat([p.lon, p.lat]);
      marca.oyentes.drag({ target: marca });
    });
  const lineaDelMarcado = () => mapa().fuentes.marcado.data.features.find((f) => f.properties.tipo === 'linea').geometry.coordinates;

  it('L13: al arrastrar el punto de en medio, la línea y las cifras siguen al dedo antes de soltar', () => {
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);

    arrastrar(arrastrables()[0], alNorte(100));

    expect(textos()).toEqual(['mapa.tramo {"metros":100}', 'mapa.tramo {"metros":200}']);
    expect(lineaDelMarcado()).toHaveLength(3);
    arrastrar(arrastrables()[0], alNorte(140));
    expect(textos()).toEqual(['mapa.tramo {"metros":140}', 'mapa.tramo {"metros":160}']);
    expect(deLaLinea()[0].p[1]).toBeCloseTo((T.lat + alNorte(140).lat) / 2, 9);
  });

  it('L13: al arrastrar un codo ya puesto, igual', () => {
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);
    soltar(arrastrables()[0], alNorte(100));
    const codo = arrastrables()[0];

    arrastrar(codo, alNorte(180));

    expect(textos()).toEqual(['mapa.tramo {"metros":180}', 'mapa.tramo {"metros":120}']);
    expect(lineaDelMarcado()[1]).toEqual([T.lon, alNorte(180).lat]);
  });

  it('L13: con un codo, arrastrar el punto del segundo tramo lo mete entre el codo y el green', () => {
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);
    soltar(arrastrables()[0], alNorte(100));
    // El codo, el punto del primer tramo y el del segundo
    arrastrar(arrastrables()[2], alNorte(250));

    expect(textos()).toEqual(['mapa.tramo {"metros":100}', 'mapa.tramo {"metros":150}', 'mapa.tramo {"metros":50}']);
  });

  it('L13: en un par 5, arrastrar el segundo punto mete el codo después del primero', () => {
    marcar({ metros: 300, par: 5 });
    tocar(T);
    tocar(G);
    // Los dos puntos, a un tercio y a dos tercios
    arrastrar(arrastrables()[1], alNorte(250));

    expect(textos()).toEqual(['mapa.tramo {"metros":250}', 'mapa.tramo {"metros":50}']);
  });

  it('L14: mientras se ajusta, las cifras van por encima del tramo (no las tapa el punto); guardado, en el tramo', () => {
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);
    expect(deLaLinea()[0].offset).toEqual([0, -24]);
  });

  it('L14: en un hoyo abierto (sin ajustar), en mitad del tramo', () => {
    abrir({ hoyo: { playLine: [T, G], green: { front: alNorte(290), center: G, back: alNorte(310) } } });

    expect(deLaLinea()[0].offset).toEqual([0, 0]);
  });

  it('L15: el lector de pantalla no lee las cifras sueltas, sino una frase con los tramos', () => {
    abrir({ hoyo: { playLine: [T, alNorte(120), G], green: { front: alNorte(290), center: G, back: alNorte(310) } } });

    expect(deLaLinea().every((m) => m.opciones.element.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(screen.getByTestId('tramos-de-la-linea')).toHaveClass('sr-only');
    expect(screen.getByTestId('tramos-de-la-linea')).toHaveTextContent('mapa.lineaDosTramos {"a":120,"b":180}');
  });

  it.each([
    [[], 'mapa.lineaUnTramo {"a":300}'],
    [[100, 200], 'mapa.lineaTresTramos {"a":100,"b":100,"c":100}'],
  ])('L15: con codos a %j m, su frase', (codos, frase) => {
    abrir({ hoyo: { playLine: [T, ...codos.map((m) => alNorte(m)), G], green: { front: alNorte(290), center: G, back: alNorte(310) } } });

    expect(screen.getByTestId('tramos-de-la-linea')).toHaveTextContent(frase);
  });

  it('L15: una línea de más de tres tramos (un mapa aprobado), la lista', () => {
    abrir({ hoyo: { playLine: [T, alNorte(50), alNorte(100), alNorte(150), G], green: { front: alNorte(290), center: G, back: alNorte(310) } } });

    expect(screen.getByTestId('tramos-de-la-linea')).toHaveTextContent('mapa.lineaVariosTramos {"lista":"50 · 50 · 50 · 150"}');
  });

  it('L15: sin línea, sin frase', () => {
    abrir({ hoyo: null });

    expect(screen.queryByTestId('tramos-de-la-linea')).toBeNull();
  });

  it('L17: si el hoyo cambia con el mapa abierto, la línea discontinua y sus cifras van juntas', () => {
    const viejo = { playLine: [T, G], green: { front: alNorte(290), center: G, back: alNorte(310) } };
    const nuevo = { playLine: [T, alNorte(280)], green: { front: alNorte(270), center: alNorte(280), back: alNorte(290) } };
    const { rerender } = abrir({ hoyo: viejo });
    act(() => mapa().oyentes.load());

    rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={nuevo} atribucion={null} onCerrar={() => {}} />);

    expect(textos()).toEqual(['mapa.tramo {"metros":280}']);
    const linea = mapa().fuentes.hoyo.data.features.find((f) => f.properties.tipo === 'linea').geometry.coordinates;
    expect(linea.at(-1)).toEqual([T.lon, alNorte(280).lat]);
  });

  it('CR1: si el hoyo cambia antes de que cargue el mapa, la línea sale del hoyo nuevo', () => {
    const viejo = { playLine: [T, G], green: { front: alNorte(290), center: G, back: alNorte(310) } };
    const nuevo = { playLine: [T, alNorte(280)], green: { front: alNorte(270), center: alNorte(280), back: alNorte(290) } };
    const { rerender } = abrir({ hoyo: viejo });

    rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={nuevo} atribucion={null} onCerrar={() => {}} />);
    act(() => mapa().oyentes.load());

    const linea = mapa().fuentes.hoyo.data.features.find((f) => f.properties.tipo === 'linea').geometry.coordinates;
    expect(linea.at(-1)).toEqual([T.lon, alNorte(280).lat]);
  });

  it('CR2: sin metros en la tarjeta, mientras se marca, el recuadro mide la línea que se marca', () => {
    marcar({ metros: null });
    tocar(T);
    tocar(G);

    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('300');
    soltar(arrastrables()[0], { lat: alNorte(150).lat, lon: T.lon + 0.001 });
    expect(Number(screen.getByTestId('distancia-centro').textContent)).toBeGreaterThan(300);
  });

  it('CR4: marcando solo el green (sin puntos que arrastrar), las cifras van en su tramo', () => {
    marcar({ hoyo: { playLine: [T, alNorte(150), alNorte(280)], green: null }, porMarcar: 'green', metros: 300 });

    tocar(G);

    expect(deLaLinea().every((m) => m.offset[0] === 0 && m.offset[1] === 0)).toBe(true);
  });

  it('CR4: con los dos codos puestos (ya no hay puntos en medio), en su tramo', () => {
    marcar({ metros: 300, par: 5 });
    tocar(T);
    tocar(G);
    soltar(arrastrables()[0], alNorte(100));
    soltar(arrastrables().at(-1), alNorte(200));

    expect(deLaLinea().every((m) => m.offset[0] === 0 && m.offset[1] === 0)).toBe(true);
  });

  it('L16: con React en modo estricto (dos montajes), las cifras cuelgan del mapa que queda', () => {
    render(
      <StrictMode>
        <MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={{ playLine: [T, G], green: { front: alNorte(290), center: G, back: alNorte(310) } }} atribucion={null} onCerrar={() => {}} />
      </StrictMode>
    );

    expect(deLaLinea().length).toBe(1);
    expect(deLaLinea().every((m) => m.mapa === mapa())).toBe(true);
  });

  it('L12: el aviso de la tarjeta sigue midiendo por los codos (como la medida oficial)', async () => {
    // Recta de 300 m, pero con el codo a 200 m al este la línea mide más de 375 m
    marcar({ metros: 300 });
    tocar(T);
    tocar(G);
    soltar(arrastrables()[0], { lat: alNorte(150).lat, lon: T.lon + 200 / (M_POR_GRADO * Math.cos((T.lat * Math.PI) / 180)) });

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'mapa.guardarMarca' })));

    expect(screen.getByRole('alertdialog')).toHaveTextContent('"tarjeta":300');
  });
});
