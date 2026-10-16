import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { orientacionDelHoyo, limitesDelHoyo, rumbo } from '../../../domain/services/geometriaDelHoyo';
import { circuloAlrededor } from '../../../domain/services/hoyoMarcado';

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
    // Como MapLibre 6: `on` devuelve una suscripción, no el mapa (no se encadena)
    on(evento, fn) {
      this.oyentes[evento] = fn;
      return { unsubscribe: () => delete this.oyentes[evento] };
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
    // Como MapLibre 6: `on` devuelve una suscripción, no el marcador. Devolvía
    // `this` y tapó un `.on().on()` que en el Kind rompía el mapa (QA, 16 oct)
    on(evento, fn) {
      this.oyentes[evento] = fn;
      return { unsubscribe: () => delete this.oyentes[evento] };
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

      // El green, del hoyo; la línea, aparte, porque se puede mover (16 oct)
      expect(mapa().fuentes.hoyo.data.features.map((f) => f.geometry.type)).toEqual(['Point']);
      expect(mapa().fuentes.marcado.data.features[0].geometry.coordinates[0]).toEqual([-5.33, 36.28]);
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

// Agustín, 16 oct: marcar con los codos del par, mover cualquier línea para
// medir, y al cerrar, si se hizo o se movió y el hoyo recoge, la muestra (sin
// decirle nada al jugador). Los metros, en cada tramo, siguen al dedo
describe('MapaDelHoyo — marcar, mover y la muestra al cerrar', () => {
  const M_POR_GRADO = (6371008.8 * Math.PI) / 180;
  const T = { lat: 36.28, lon: -5.33 };
  const alNorte = (m, de = T) => ({ lat: de.lat + m / M_POR_GRADO, lon: de.lon });
  const alEste = (m, de = T) => ({ lat: de.lat, lon: de.lon + m / (M_POR_GRADO * Math.cos((de.lat * Math.PI) / 180)) });
  const G = alNorte(300);
  const GREEN_G = { front: alNorte(290), center: G, back: alNorte(310) };
  const tocar = (p) => act(() => mapa().oyentes.click({ lngLat: { lat: p.lat, lng: p.lon } }));
  const vivas = () => mapas.marcas.filter((m) => !m.quitada);
  const arrastrables = () => vivas().filter((m) => m.opciones.draggable);
  const soltar = (marca, p) =>
    act(() => {
      marca.setLngLat([p.lon, p.lat]);
      marca.oyentes.dragend({ target: marca });
    });
  const arrastrar = (marca, p) =>
    act(() => {
      marca.setLngLat([p.lon, p.lat]);
      marca.oyentes.drag({ target: marca });
    });
  const deLaLinea = () => vivas().filter((m) => m.opciones.element?.dataset?.tramo === 'linea');
  const textos = () => deLaLinea().map((m) => m.opciones.element.textContent);
  const lineaDibujada = () => mapa().fuentes.marcado.data.features.find((f) => f.properties.tipo === 'linea')?.geometry.coordinates;
  const marcar = (props = {}) => {
    const onMuestra = props.onMuestra ?? vi.fn();
    const r = abrir({ hoyo: null, porMarcar: 'salida', recoge: true, onMuestra, ...props });
    act(() => mapa().oyentes.load());
    return { ...r, onMuestra };
  };
  const hoyoCon = (playLine, green = GREEN_G) => ({ playLine, green });

  let gps;
  let reloj;
  beforeEach(() => {
    mapas.length = 0;
    mapas.marcas = [];
    mapas.sinWebgl = false;
    centro.valor = null;
    gps = gpsFalso();
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gps });
    // Un segundo entre toque y toque: así no cuentan como doble toque
    let ahora = 0;
    reloj = vi.spyOn(globalThis.performance, 'now').mockImplementation(() => (ahora += 1000));
  });
  afterEach(() => {
    reloj.mockRestore();
    vi.unstubAllGlobals();
  });

  describe('marcar un hoyo sin línea', () => {
    it('P1: pide la salida, con «Ahora no»; y ni «Guardar» ni «Volver a marcar»', () => {
      marcar();

      expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'mapa.ahoraNo' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'mapa.guardarMarca' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'mapa.volverAMarcar' })).toBeNull();
    });

    it('P2: al tocar la salida, su punto, sin anillo ni cifra; el mapa se aleja la mitad de la tarjeta, sin girar', () => {
      marcar({ metros: 300 });
      mapa().fitBounds.mockClear();

      tocar(T);

      expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
      expect(mapa().fuentes.marcado.data.features).toEqual([]);
      expect(vivas().some((m) => /mapa\.arco/.test(m.opciones.element?.textContent ?? ''))).toBe(false);
      expect(vivas().some((m) => m.opciones.element?.className.includes('bg-white') && m.p[1] === T.lat)).toBe(true);
      const [limites, opciones] = mapa().fitBounds.mock.calls[0];
      expect(limites).toEqual(limitesDelHoyo({ playLine: circuloAlrededor(T, 150) }));
      expect(opciones.bearing).toBe(0);
    });

    it('P2: sin metros en la tarjeta, al tocar la salida el mapa no se mueve', () => {
      marcar({ metros: null });
      mapa().fitBounds.mockClear();

      tocar(T);

      expect(mapa().fitBounds).not.toHaveBeenCalled();
    });

    it.each([
      [3, 0],
      [4, 1],
      [5, 2],
      [null, 1],
    ])('P3: al tocar el green de un par %s, la línea con %i codos ya puestos, todo arrastrable', (par, codos) => {
      marcar({ metros: 300, par });
      tocar(T);

      tocar(G);

      expect(lineaDibujada()).toHaveLength(codos + 2);
      expect(arrastrables()).toHaveLength(codos + 2);
      expect(textos()).toHaveLength(codos + 1);
      expect(screen.queryByText('mapa.pideGreen')).toBeNull();
    });

    it('P3: los codos van sobre la recta (la longitud no cambia)', () => {
      marcar({ metros: 300, par: 5 });
      tocar(T);

      tocar(G);

      expect(textos()).toEqual(['mapa.tramo {"metros":100}', 'mapa.tramo {"metros":100}', 'mapa.tramo {"metros":100}']);
    });

    it('P4: un green a menos de 40 m (o más de 750) no vale: lo dice y sigue pidiéndolo', () => {
      marcar({ metros: 300 });
      tocar(T);

      tocar(alNorte(30));

      expect(screen.getByRole('alert')).toHaveTextContent('mapa.fueraDeLimites');
      expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
      tocar(alNorte(800));
      expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
      tocar(G);
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('P5: la ayuda de los codos sale con codos, y se va al mover uno; un par 3 no la lleva', () => {
      const { unmount } = marcar({ metros: 300, par: 4 });
      tocar(T);
      tocar(G);
      expect(screen.getByText('mapa.ayudaCodo')).toBeInTheDocument();

      soltar(arrastrables()[1], alEste(40, alNorte(150)));
      expect(screen.queryByText('mapa.ayudaCodo')).toBeNull();
      unmount();

      marcar({ metros: 150, par: 3 });
      tocar(T);
      tocar(alNorte(150));
      expect(screen.queryByText('mapa.ayudaCodo')).toBeNull();
    });

    it('P6: solo el green, sobre la línea aprobada: su final (donde acaba en OSM) pasa a ser el green tocado', () => {
      const codo = alNorte(150);
      marcar({ hoyo: { playLine: [T, codo, alNorte(280)], green: null }, porMarcar: 'green', metros: 300, par: 4 });

      tocar(G);

      // Ya tiene el codo de su par: no se añade otro, ni uno falso junto al green
      expect(lineaDibujada()).toEqual([[T.lon, T.lat], [codo.lon, codo.lat], [G.lon, G.lat]]);
    });

    it('P6: solo el green con la salida sola (un punto): la salida y el green, con los codos del par', () => {
      marcar({ hoyo: { playLine: [T], green: null }, porMarcar: 'green', metros: 300, par: 5 });

      tocar(G);

      expect(lineaDibujada()).toHaveLength(4);
      expect(lineaDibujada()[0]).toEqual([T.lon, T.lat]);
    });

    it('P6 (16 oct): pidiendo solo el green, la salida aprobada se ve y el mapa se aleja la mitad de la tarjeta', () => {
      marcar({ hoyo: { playLine: [T], green: null }, porMarcar: 'green', metros: 300, par: 4 });

      expect(vivas().some((m) => m.opciones.element?.className.includes('bg-white') && m.p[1] === T.lat)).toBe(true);
      expect(mapa().fitBounds).toHaveBeenCalledWith(
        limitesDelHoyo({ playLine: circuloAlrededor(T, 150) }),
        expect.objectContaining({ bearing: 0 }),
      );
    });

    it('P5: la ayuda de los codos solo si se añadieron (sobre una línea aprobada con su codo, no)', () => {
      marcar({ hoyo: { playLine: [T, alNorte(150), alNorte(280)], green: null }, porMarcar: 'green', metros: 300, par: 4 });

      tocar(G);

      expect(screen.queryByText('mapa.ayudaCodo')).toBeNull();
    });

    it('P7: el doble toque (dos toques seguidos) no pone salida y green en el mismo sitio', () => {
      const toques = [1000, 1100];
      reloj.mockImplementation(() => toques.shift() ?? 9999);
      marcar({ metros: 300 });

      tocar(T);
      tocar(T);

      expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
      expect(lineaDibujada()).toBeUndefined();
    });

    it('P7: mientras se pide, el doble toque no acerca el mapa', () => {
      marcar();

      expect(mapa().doubleClickZoom.disable).toHaveBeenCalled();
    });

    it('P8: «Ahora no» deja medir, y «Marcar hoyo» vuelve a pedirlo', () => {
      marcar();

      fireEvent.click(screen.getByRole('button', { name: 'mapa.ahoraNo' }));
      expect(screen.getByText('mapa.ayudaMedir')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /mapa\.marcarHoyo/ }));

      expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
    });

    it('P9: marcado ya, un toque mide (no marca)', () => {
      marcar({ metros: 300 });
      tocar(T);
      tocar(G);

      tocar(alNorte(150));

      expect(screen.getByRole('button', { name: 'mapa.quitarPunto' })).toBeInTheDocument();
      expect(lineaDibujada()).toHaveLength(3);
    });
  });

  describe('mover la línea', () => {
    it('M1: arrastrar un codo: la línea y las cifras siguen al dedo antes de soltar', () => {
      marcar({ metros: 300, par: 4 });
      tocar(T);
      tocar(G);

      arrastrar(arrastrables()[1], alNorte(100));
      expect(textos()).toEqual(['mapa.tramo {"metros":100}', 'mapa.tramo {"metros":200}']);
      expect(lineaDibujada()[1]).toEqual([T.lon, alNorte(100).lat]);
      arrastrar(arrastrables()[1], alNorte(140));
      expect(textos()).toEqual(['mapa.tramo {"metros":140}', 'mapa.tramo {"metros":160}']);
      expect(deLaLinea()[0].p[1]).toBeCloseTo((T.lat + alNorte(140).lat) / 2, 9);
    });

    it('M1: al soltar, queda movida', () => {
      marcar({ metros: 300, par: 4 });
      tocar(T);
      tocar(G);

      soltar(arrastrables()[1], alNorte(120));

      expect(textos()).toEqual(['mapa.tramo {"metros":120}', 'mapa.tramo {"metros":180}']);
      expect(lineaDibujada()[1]).toEqual([T.lon, alNorte(120).lat]);
    });

    it('M2: también la salida y el green', () => {
      marcar({ metros: 300, par: 3 });
      tocar(T);
      tocar(G);

      soltar(arrastrables().at(-1), alNorte(280));
      expect(textos()).toEqual(['mapa.tramo {"metros":280}']);
      soltar(arrastrables()[0], alNorte(-20));
      expect(textos()).toEqual(['mapa.tramo {"metros":300}']);
    });

    it('M3: un hoyo aprobado sin codos (par 4) lleva su codo para moverlo', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 4 });
      act(() => mapa().oyentes.load());

      expect(arrastrables()).toHaveLength(3);
      expect(textos()).toEqual(['mapa.tramo {"metros":150}', 'mapa.tramo {"metros":150}']);
    });

    it('M3: una línea de un mapa con más puntos que su par no se toca (se dibujan todos)', () => {
      abrir({ hoyo: hoyoCon([T, alNorte(50), alNorte(100), alNorte(150), G]), par: 4 });
      act(() => mapa().oyentes.load());

      expect(lineaDibujada()).toHaveLength(5);
    });

    it('M4: la línea que se mueve se dibuja aparte; del hoyo, solo su green', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      act(() => mapa().oyentes.load());

      expect(mapa().fuentes.hoyo.data.features.map((f) => f.properties.tipo)).toEqual(['green']);
      expect(lineaDibujada()).toEqual([[T.lon, T.lat], [G.lon, G.lat]]);
    });

    it('M5: sin metros en la tarjeta, el recuadro mide la línea como está ahora', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 4, metros: null });
      act(() => mapa().oyentes.load());
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('300');

      soltar(arrastrables()[1], alEste(100, alNorte(150)));

      expect(Number(screen.getByTestId('distancia-centro').textContent)).toBeGreaterThan(300);
    });

    it('M5: con metros en la tarjeta, el recuadro no se mueve', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 4, metros: 342 });
      act(() => mapa().oyentes.load());

      soltar(arrastrables()[1], alEste(100, alNorte(150)));

      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
    });

    it('M6: mover el green de un hoyo aprobado: el recuadro pasa a ±10 m, sin su contorno', () => {
      abrir({ hoyo: hoyoCon([T, G], { front: alNorte(280), center: G, back: alNorte(320) }), par: 3, metros: 342 });
      act(() => mapa().oyentes.load());
      expect(screen.getByTestId('distancia-delante')).toHaveTextContent('322');

      soltar(arrastrables().at(-1), alNorte(290));

      expect(screen.getByTestId('distancia-delante')).toHaveTextContent('332');
    });
  });

  describe('la muestra, al cerrar', () => {
    it('S1: lo marcado se envía al cerrar, con sus codos', () => {
      const { unmount, onMuestra } = marcar({ metros: 300, par: 4 });
      tocar(T);
      tocar(G);
      soltar(arrastrables()[1], alEste(40, alNorte(150)));
      expect(onMuestra).not.toHaveBeenCalled();

      unmount();

      expect(onMuestra).toHaveBeenCalledTimes(1);
      const enviada = onMuestra.mock.calls[0][0];
      expect(enviada.tee).toEqual(T);
      expect(enviada.greenCenter).toEqual(G);
      expect(enviada.bends).toHaveLength(1);
      expect(enviada.bends[0].lon).toBeCloseTo(alEste(40, alNorte(150)).lon, 9);
    });

    it('S1: marcado sin tocar los codos, también (lo hizo él)', () => {
      const { unmount, onMuestra } = marcar({ metros: 300, par: 3 });
      tocar(T);
      tocar(G);

      unmount();

      expect(onMuestra).toHaveBeenCalledWith({ id: expect.any(String), tee: T, bends: [], greenCenter: G });
    });

    it('S2: abrir y cerrar sin mover nada no envía nada', () => {
      const onMuestra = vi.fn();
      const { unmount } = abrir({ hoyo: hoyoCon([T, G]), par: 4, recoge: true, onMuestra });
      act(() => mapa().oyentes.load());

      unmount();

      expect(onMuestra).not.toHaveBeenCalled();
    });

    it('S3: mover un hoyo que aún recoge y cerrar envía la línea movida', () => {
      const onMuestra = vi.fn();
      const { unmount } = abrir({ hoyo: hoyoCon([T, G]), par: 4, recoge: true, onMuestra });
      act(() => mapa().oyentes.load());
      soltar(arrastrables()[1], alEste(50, alNorte(150)));

      unmount();

      expect(onMuestra).toHaveBeenCalledTimes(1);
      expect(onMuestra.mock.calls[0][0].bends).toHaveLength(1);
    });

    it('S4: un hoyo que ya no recoge: se mueve para medir, pero no se envía', () => {
      const onMuestra = vi.fn();
      const { unmount } = abrir({ hoyo: hoyoCon([T, G]), par: 4, recoge: false, onMuestra });
      act(() => mapa().oyentes.load());
      soltar(arrastrables()[1], alEste(50, alNorte(150)));

      unmount();

      expect(onMuestra).not.toHaveBeenCalled();
    });

    it('S5: una línea que el servidor no guardaría (green a menos de 40 m) no se envía', () => {
      const { unmount, onMuestra } = marcar({ metros: 300, par: 3 });
      tocar(T);
      tocar(G);
      soltar(arrastrables().at(-1), alNorte(20));

      unmount();

      expect(onMuestra).not.toHaveBeenCalled();
    });

    it('S5: ni una con más de dos codos (la de un mapa con muchos puntos)', () => {
      const onMuestra = vi.fn();
      const { unmount } = abrir({ hoyo: hoyoCon([T, alNorte(50), alNorte(100), alNorte(150), G]), par: 4, recoge: true, onMuestra });
      act(() => mapa().oyentes.load());
      soltar(arrastrables()[1], alEste(20, alNorte(50)));

      unmount();

      expect(onMuestra).not.toHaveBeenCalled();
    });

    it('S6: sin quien la reciba (sin sesión), nada', () => {
      const { unmount } = marcar({ metros: 300, par: 3, onMuestra: null });
      tocar(T);
      tocar(G);

      expect(() => unmount()).not.toThrow();
    });

    it('S7: el aviso de la tarjeta ya no existe: nada pregunta antes de cerrar', () => {
      const { onMuestra } = marcar({ metros: 142, par: 3 });
      tocar(T);
      tocar(G);

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(onMuestra).not.toHaveBeenCalled();
    });

    it('S9: la muestra lleva un id (un reintento cuenta una vez), el mismo si se envía dos veces sin cambios', () => {
      const { unmount, onMuestra } = marcar({ metros: 300, par: 3 });
      tocar(T);
      tocar(G);
      act(() => {
        Object.defineProperty(globalThis.document, 'visibilityState', { value: 'hidden', configurable: true });
        globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
      });
      expect(onMuestra).toHaveBeenCalledTimes(1);
      const { id } = onMuestra.mock.calls[0][0];
      expect(id).toMatch(/^[0-9a-f-]{36}$/);

      unmount();

      // Sin cambios desde que se ocultó: no sale otra
      expect(onMuestra).toHaveBeenCalledTimes(1);
      Object.defineProperty(globalThis.document, 'visibilityState', { value: 'visible', configurable: true });
    });

    it('S9: al ocultarse la app se guarda lo hecho; si luego se mueve más, al cerrar sale otra vez', () => {
      const { unmount, onMuestra } = marcar({ metros: 300, par: 4 });
      tocar(T);
      tocar(G);
      act(() => {
        Object.defineProperty(globalThis.document, 'visibilityState', { value: 'hidden', configurable: true });
        globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
      });
      Object.defineProperty(globalThis.document, 'visibilityState', { value: 'visible', configurable: true });
      soltar(arrastrables()[1], alEste(30, alNorte(150)));

      unmount();

      expect(onMuestra).toHaveBeenCalledTimes(2);
    });

    it('S9: ocultarse sin haber hecho nada no envía', () => {
      const onMuestra = vi.fn();
      abrir({ hoyo: hoyoCon([T, G]), par: 4, recoge: true, onMuestra });
      act(() => {
        Object.defineProperty(globalThis.document, 'visibilityState', { value: 'hidden', configurable: true });
        globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
      });
      Object.defineProperty(globalThis.document, 'visibilityState', { value: 'visible', configurable: true });

      expect(onMuestra).not.toHaveBeenCalled();
    });

    it('S10: avisa la primera vez que el jugador empieza (para que no le cambien el mapa)', () => {
      const onEmpezar = vi.fn();
      marcar({ metros: 300, par: 4, onEmpezar });
      expect(onEmpezar).not.toHaveBeenCalled();

      tocar(T);
      expect(onEmpezar).toHaveBeenCalledTimes(1);
      tocar(G);
      expect(onEmpezar).toHaveBeenCalledTimes(1);
    });

    it('S10: también al mover una línea que ya estaba', () => {
      const onEmpezar = vi.fn();
      abrir({ hoyo: hoyoCon([T, G]), par: 4, onEmpezar });
      act(() => mapa().oyentes.load());

      soltar(arrastrables()[1], alEste(30, alNorte(150)));

      expect(onEmpezar).toHaveBeenCalledTimes(1);
    });

    it('S11: tocar un punto arrastrable no cuenta como toque en el mapa (no mide)', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 4 });
      act(() => mapa().oyentes.load());
      const evento = new globalThis.MouseEvent('click', { bubbles: true });
      const parar = vi.spyOn(evento, 'stopPropagation');

      arrastrables()[1].opciones.element.dispatchEvent(evento);

      expect(parar).toHaveBeenCalled();
    });

    it('CR1: un hoyo aprobado cuya línea no acaba en el centro del green (OSM): se mide al green de verdad', () => {
      const verde = { front: alNorte(305), center: alNorte(320), back: alNorte(335) };
      abrir({ hoyo: hoyoCon([T, G], verde), par: 3, metros: 342 });
      act(() => mapa().oyentes.load());

      // La línea acaba en su centro, y el recuadro usa su contorno (15 m), no ±10
      expect(lineaDibujada().at(-1)).toEqual([T.lon, alNorte(320).lat]);
      expect(screen.getByTestId('distancia-delante')).toHaveTextContent('327');
      expect(textos()).toEqual(['mapa.tramo {"metros":320}']);
    });

    it('CR4: toda la apertura es una muestra con un solo id (oculta y luego cerrada tras moverla, el mismo)', () => {
      const { unmount, onMuestra } = marcar({ metros: 300, par: 4 });
      tocar(T);
      tocar(G);
      act(() => {
        Object.defineProperty(globalThis.document, 'visibilityState', { value: 'hidden', configurable: true });
        globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
      });
      Object.defineProperty(globalThis.document, 'visibilityState', { value: 'visible', configurable: true });
      soltar(arrastrables()[1], alEste(30, alNorte(150)));

      unmount();

      expect(onMuestra).toHaveBeenCalledTimes(2);
      expect(onMuestra.mock.calls[1][0].id).toBe(onMuestra.mock.calls[0][0].id);
    });

    it('CR6: un punto a más de 3 km del campo (si se sabe dónde está) no se envía', () => {
      centro.valor = T;
      const { unmount, onMuestra } = marcar({ metros: 300, par: 3 });
      tocar(T);
      tocar(G);
      soltar(arrastrables()[0], alNorte(-3100));
      soltar(arrastrables().at(-1), alNorte(-2800));

      unmount();

      expect(onMuestra).not.toHaveBeenCalled();
    });

    it('CR6 (CodeRabbit): en un hoyo aprobado (sin la ubicación del campo), los 3 km se miden desde su salida', () => {
      const onMuestra = vi.fn();
      const { unmount } = abrir({ hoyo: hoyoCon([T, G]), par: 3, recoge: true, onMuestra });
      act(() => mapa().oyentes.load());
      soltar(arrastrables()[0], alNorte(-3500));
      soltar(arrastrables().at(-1), alNorte(-3200));

      unmount();

      expect(onMuestra).not.toHaveBeenCalled();
    });

    it('CR10: una línea de OSM con más puntos que codos: solo se arrastran la salida y el green', () => {
      abrir({ hoyo: hoyoCon([T, alNorte(50), alNorte(100), alNorte(150), G]), par: 4 });
      act(() => mapa().oyentes.load());

      expect(arrastrables()).toHaveLength(2);
    });

    it('S8: «Cerrar» cierra (y la muestra sale al desmontar, una vez)', () => {
      const onCerrar = vi.fn();
      const { unmount, onMuestra } = marcar({ metros: 300, par: 3, onCerrar });
      tocar(T);
      tocar(G);

      fireEvent.click(screen.getAllByRole('button', { name: 'mapa.cerrar' })[0]);
      expect(onCerrar).toHaveBeenCalled();
      unmount();

      expect(onMuestra).toHaveBeenCalledTimes(1);
    });
  });

  describe('metros de cada tramo', () => {
    it('T1: un hoyo ya marcado o aprobado, al abrirlo, lleva los metros de cada tramo', () => {
      abrir({ hoyo: hoyoCon([T, alNorte(120), G]), par: 4 });
      act(() => mapa().oyentes.load());

      expect(textos()).toEqual(['mapa.tramo {"metros":120}', 'mapa.tramo {"metros":180}']);
    });

    it('T2: lejos del campo, igual', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      act(() => mapa().oyentes.load());
      act(() => gps.exito(lectura(40.4, -3.7)));

      expect(textos()).toEqual(['mapa.tramo {"metros":300}']);
    });

    it('T2: sin GPS, también', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      act(() => mapa().oyentes.load());
      act(() => gps.error({ code: 1 }));

      expect(textos()).toEqual(['mapa.tramo {"metros":300}']);
    });

    it('T3: medir tocando no se mezcla: sus cifras van aparte', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      act(() => mapa().oyentes.load());
      act(() => gps.exito(lectura(alNorte(50).lat, T.lon)));

      tocar(alNorte(150));

      expect(textos()).toEqual(['mapa.tramo {"metros":300}']);
      const medida = vivas().filter((m) => m.opciones.element?.dataset?.tramo === 'medida').map((m) => m.opciones.element.textContent);
      expect(medida).toEqual(['mapa.tramo {"metros":100}', 'mapa.tramo {"metros":150}']);
    });

    it('T4: un hoyo sin línea (solo la salida) no pinta cifras', () => {
      abrir({ hoyo: { playLine: [T], green: null } });
      act(() => mapa().oyentes.load());

      expect(textos()).toEqual([]);
    });

    it('T5: el lector de pantalla no lee las cifras sueltas, sino una frase con los tramos', () => {
      abrir({ hoyo: hoyoCon([T, alNorte(120), G]), par: 4 });

      expect(deLaLinea().every((m) => m.opciones.element.getAttribute('aria-hidden') === 'true')).toBe(true);
      expect(screen.getByTestId('tramos-de-la-linea')).toHaveClass('sr-only');
      expect(screen.getByTestId('tramos-de-la-linea')).toHaveTextContent('mapa.lineaDosTramos {"a":120,"b":180}');
    });

    it.each([
      [3, [], 'mapa.lineaUnTramo {"a":300}'],
      [5, [100, 200], 'mapa.lineaTresTramos {"a":100,"b":100,"c":100}'],
    ])('T5: par %s con codos a %j m, su frase', (par, codos, frase) => {
      abrir({ hoyo: hoyoCon([T, ...codos.map((m) => alNorte(m)), G]), par });

      expect(screen.getByTestId('tramos-de-la-linea')).toHaveTextContent(frase);
    });

    it('T5: una línea de más de tres tramos (un mapa aprobado), la lista', () => {
      abrir({ hoyo: hoyoCon([T, alNorte(50), alNorte(100), alNorte(150), G]) });

      expect(screen.getByTestId('tramos-de-la-linea')).toHaveTextContent('mapa.lineaVariosTramos {"lista":"50 · 50 · 50 · 150"}');
    });

    it('T5: sin línea, sin frase', () => {
      abrir({ hoyo: null });

      expect(screen.queryByTestId('tramos-de-la-linea')).toBeNull();
    });

    it('T6: si el hoyo cambia antes de que cargue el mapa, se dibuja el nuevo', () => {
      const viejo = { playLine: [T], green: null };
      const nuevo = { playLine: [T, alNorte(280)], green: null };
      const { rerender } = abrir({ hoyo: viejo });

      rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={nuevo} atribucion={null} onCerrar={() => {}} />);
      act(() => mapa().oyentes.load());

      const linea = mapa().fuentes.hoyo.data.features.find((f) => f.properties.tipo === 'linea').geometry.coordinates;
      expect(linea.at(-1)).toEqual([T.lon, alNorte(280).lat]);
    });

    it('T7: con React en modo estricto (dos montajes), cifras y puntos cuelgan del mapa que queda', () => {
      render(
        <StrictMode>
          <MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={3} hoyo={hoyoCon([T, G])} atribucion={null} onCerrar={() => {}} />
        </StrictMode>
      );

      expect(deLaLinea()).toHaveLength(1);
      expect(deLaLinea().every((m) => m.mapa === mapa())).toBe(true);
      expect(arrastrables().every((m) => m.mapa === mapa())).toBe(true);
    });

    it('T7: en modo estricto, el montaje doble no envía ninguna muestra', () => {
      const onMuestra = vi.fn();
      render(
        <StrictMode>
          <MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={3} hoyo={hoyoCon([T, G])} atribucion={null} onCerrar={() => {}} recoge onMuestra={onMuestra} />
        </StrictMode>
      );

      expect(onMuestra).not.toHaveBeenCalled();
    });
  });
});
