import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { encuadreGirado, orientacionDelHoyo, limitesDelHoyo, rumbo } from '../../../domain/services/geometriaDelHoyo';
import { circuloAlrededor } from '../../../domain/services/hoyoMarcado';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => (o ? `${k} ${JSON.stringify(o)}` : k) }),
}));

// MapLibre de mentira: guarda lo que se le pide para poder comprobarlo
const mapas = vi.hoisted(() => []);
vi.mock('maplibre-gl', () => {
  // Como `Evented` de MapLibre 6: `on` devuelve una suscripción (no se
  // encadena), acumula oyentes del mismo evento y cada uno se quita solo. La
  // forma con capa (`on(tipo, capa, fn)`) guarda su `fn`. `oyentes[evento]`
  // lanza todos los de ese evento
  class Evented {
    on(evento, ...resto) {
      const fn = resto.at(-1);
      this.lista ??= {};
      this.oyentes ??= {};
      (this.lista[evento] ??= []).push(fn);
      this.oyentes[evento] = (...args) => this.lista[evento].forEach((f) => f(...args));
      return {
        unsubscribe: () => {
          this.lista[evento] = this.lista[evento].filter((f) => f !== fn);
        },
      };
    }
  }
  class Map extends Evented {
    constructor(opciones) {
      super();
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
      this.dragRotate = { disable: vi.fn() };
      this.doubleClickZoom = { disable: vi.fn(), enable: vi.fn() };
      this.getBearing = vi.fn(() => 0);
      this.keyboard = { disableRotation: vi.fn() };
      mapas.push(this);
    }
    // Como MapLibre 6: `on` devuelve una suscripción, no el mapa (no se encadena)

    addSource(id, fuente) {
      this.fuentes[id] = fuente;
    }
    removeSource(id) {
      delete this.fuentes[id];
    }
    getLayer() {
      return undefined;
    }
    removeLayer() {}
    getStyle() {
      return { layers: this.opciones.style.layers };
    }
    getSource(id) {
      return this.fuentes[id] ? { setData: (d) => { this.fuentes[id].data = d; } } : undefined;
    }
  }
  class Marker extends Evented {
    constructor(opciones = {}) {
      super();
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

    setOffset(o) {
      this.offset = o;
      return this;
    }
    addTo(mapa) {
      this.mapa = mapa;
      return this;
    }
  }
  mapas.claseMarker = { Marker };
  return { Map, Marker, setWorkerUrl: vi.fn() };
});

const apuntado = vi.hoisted(() => ({ captureError: null }));
vi.mock('../../../utils/sentryHelpers', () => {
  apuntado.captureError = vi.fn();
  return { captureError: (...args) => apuntado.captureError(...args) };
});

const centro = vi.hoisted(() => ({ valor: null, args: null }));
vi.mock('../../../hooks/useCentroSinMapa', () => ({
  useCentroSinMapa: (args) => {
    centro.args = args;
    return centro.valor;
  },
}));

const { default: MapaDelHoyo } = await import('./MapaDelHoyo');
const { ORTOFOTOS } = await import('./teselas');
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
// Par 4 con codo: de la salida al primer codo (O1)
const RUMBO_DEL_HOYO = rumbo(HOYO.playLine[0], HOYO.playLine[1]);
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

  it('M3 (19 oct): la caja del mapa, en negro', () => {
    abrir();

    expect(screen.getByRole('dialog').firstElementChild).toHaveClass('bg-black');
  });

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

      const bearing = RUMBO_DEL_HOYO;
      expect(mapa().opciones.bearing).toBeCloseTo(bearing, 6);
      expect(mapa().opciones.dragRotate).toBe(false);
      expect(mapa().opciones.pitchWithRotate).toBe(false);
      expect(mapa().touchZoomRotate.disableRotation).toHaveBeenCalled();
      // Con el hoyo girado (no su caja norte-sur): centro, zoom y rumbo, y SIN
      // padding (MapLibre lo guardaría y lo sumaría a todo lo de después)
      const { center, zoom } = encuadreGirado(HOYO, bearing, { ancho: 360, alto: 640, padding: { top: 90, bottom: 288, left: 40, right: 40 } });
      expect(mapa().jumpTo).toHaveBeenLastCalledWith({ center: [center.lon, center.lat], zoom, bearing });
    });

    it('dibuja la línea de juego y el green', () => {
      abrir();
      act(() => mapa().oyentes.load());

      // El green, del hoyo; la línea, aparte, porque se puede mover (16 oct)
      expect(mapa().fuentes.hoyo.data.features.map((f) => f.geometry.type)).toEqual(['Point']);
      expect(mapa().fuentes.marcado.data.features[0].geometry.coordinates[0]).toEqual([-5.33, 36.28]);
    });

    // Agustín, 16 oct: sin posición, el recuadro va con los metros oficiales desde
    // la salida; desde el 17 oct, en el hoyo y con buen GPS, desde ti (B1)
    it('R1: sin posición, delante, centro y fondo con la tarjeta y el green dibujado', () => {
      abrir({ metros: 342 });
      // El green del hoyo: 22 m del centro a delante y al fondo
      expect(screen.getByTestId('distancia-delante')).toHaveTextContent('320');
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
      expect(screen.getByTestId('distancia-fondo')).toHaveTextContent('364');
      expect(screen.getByText('mapa.desdeTuBarra')).toBeInTheDocument();
    });

    it('R6 (17 oct): en el hoyo con buen GPS, desde mi posición, y cambia al moverme', () => {
      abrir({ metros: 342 });

      act(() => gps.exito(lectura(36.2888, -5.332)));
      const antes = screen.getByTestId('distancia-centro').textContent;
      act(() => gps.exito(lectura(36.2893, -5.332)));

      expect(screen.getByTestId('distancia-centro').textContent).not.toBe(antes);
      expect(screen.getByText('mapa.desdeTuPosicion')).toBeInTheDocument();
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

      expect(screen.getByText('mapa.etiqueta {"front":320,"center":342,"back":364,"origen":"mapa.desdeTuBarra"}')).toHaveClass('sr-only');
    });

    it('H4: «Ver hoyo» vuelve a encuadrar el hoyo entero', () => {
      abrir();

      fireEvent.click(screen.getByRole('button', { name: 'mapa.verHoyo' }));

      expect(mapa().easeTo).toHaveBeenCalledWith(expect.objectContaining({ bearing: RUMBO_DEL_HOYO, zoom: expect.any(Number) }));
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

    it('M2 (19 oct: T1): hasta ahí, sin el tramo al green', () => {
      abrir();
      act(() => gps.exito(lectura(36.2888, -5.332)));

      tocar(36.2893, -5.332);

      expect(screen.getByText('mapa.hastaAhi {"metros":56}')).toBeInTheDocument();
      expect(screen.queryByText(/mapa\.deAhiAlGreen/)).toBeNull();
    });

    it('M2 (16 oct, 19 oct: T1): en el mapa, una línea de ti al punto con sus metros', () => {
      abrir();
      act(() => mapa().oyentes.load());
      act(() => gps.exito(lectura(36.2888, -5.332)));

      tocar(36.2893, -5.332);

      const lineas = mapa().fuentes.medida.data.features.map((f) => f.geometry.coordinates);
      // Solo la de ti al punto: la de ti al green se va (M1, Agustín, 24 oct;
      // deshace la T3 del 19 oct, que la dejaba)
      expect(lineas).toEqual([[[-5.332, 36.2888], [-5.332, 36.2893]]]);
      const etiquetas = mapas.marcas.filter((m) => !m.quitada && m.opciones.element?.dataset?.tramo === 'medida' && /mapa\.tramo/.test(m.opciones.element?.textContent ?? ''));
      expect(etiquetas.map((m) => m.opciones.element.textContent)).toEqual(['mapa.tramo {"metros":56}']);
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
      // En la salida: a mitad de hoyo se mide desde ti (H1)
      act(() => gps.exito(lectura(36.2801, -5.33)));
      mapa().fitBounds.mockClear();

      tocar(36.2893, -5.33);

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
      // En la salida: a mitad de hoyo, «Quitar» deja la línea desde ti (H6)
      act(() => gps.exito(lectura(36.2801, -5.33)));
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

    it('G2 (19 oct: T4): sin posición (ubicación no permitida) se mide desde la salida del hoyo', () => {
      abrir();
      act(() => gps.error({ code: 1 }));

      tocar(36.2893, -5.332);

      expect(screen.getByText('mapa.denegado')).toBeInTheDocument();
      expect(screen.getByText(/mapa\.hastaAhi/)).toBeInTheDocument();
      expect(screen.queryByText(/mapa\.deAhiAlGreen/)).toBeNull();
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

  describe('la ortofoto de la comunidad (19 oct)', () => {
    // La salida del hoyo, en El Prat (Cataluña)
    const EN_CATALUNYA = { playLine: [{ lat: 41.5735, lon: 2.0539 }, { lat: 41.5765, lon: 2.0545 }], green: null };

    it('O1/O6: un hoyo en Cataluña lleva la del ICGC encima de la PNOA, y su firma', () => {
      abrir({ hoyo: EN_CATALUNYA });
      act(() => mapa().oyentes.load());

      expect(mapa().fuentes.ortofoto.tiles).toEqual(ORTOFOTOS['ES-CT'].tiles);
      expect(mapa().addLayer).toHaveBeenCalledWith({ id: 'ortofoto', type: 'raster', source: 'ortofoto' }, undefined);
      expect(screen.getByText('mapa.ortofoto.ES-CT', { exact: false })).toBeInTheDocument();
    });

    it('O5: en el resto de España, solo la PNOA', () => {
      abrir();
      act(() => mapa().oyentes.load());

      expect(mapa().fuentes.ortofoto).toBeUndefined();
      expect(screen.queryByText(/mapa\.ortofoto/)).toBeNull();
    });

    it('O6: si dónde está el campo llega tarde, se pone entonces', () => {
      const { rerender } = abrir({ hoyo: null });
      act(() => mapa().oyentes.load());
      expect(mapa().fuentes.ortofoto).toBeUndefined();

      // La ubicación del campo (Ulzama, Navarra)
      centro.valor = { lat: 42.9617, lon: -1.667 };
      rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={null} atribucion={null} onCerrar={() => {}} />);

      expect(mapa().fuentes.ortofoto.tiles).toEqual(ORTOFOTOS['ES-NC'].tiles);
    });

    it('O6: si llega antes de que cargue el mapa, se pone al cargar', () => {
      const { rerender } = abrir({ hoyo: null });
      centro.valor = { lat: 42.9617, lon: -1.667 };
      rerender(<MapaDelHoyo golfCourseId="gc-1" numeroDeHoyo={1} par={4} hoyo={null} atribucion={null} onCerrar={() => {}} />);
      expect(mapa().fuentes.ortofoto).toBeUndefined();

      act(() => mapa().oyentes.load());

      expect(mapa().fuentes.ortofoto.tiles).toEqual(ORTOFOTOS['ES-NC'].tiles);
    });

    it('antes de cargar el mapa no se toca (MapLibre no deja añadir nada aún)', () => {
      abrir({ hoyo: EN_CATALUNYA });

      expect(mapa().fuentes.ortofoto).toBeUndefined();
    });
  });

  describe('licencias y tamaño', () => {
    it('L2: la PNOA siempre; «© OpenStreetMap» como enlace a su licencia si el mapa es de OSM', () => {
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

    const { zoom } = encuadreGirado(HOYO, RUMBO_DEL_HOYO, { ancho: 360, alto: 780, padding: { top: 90, bottom: 320, left: 40, right: 40 } });
    expect(mapa().jumpTo).toHaveBeenLastCalledWith(expect.objectContaining({ zoom }));
  });

  it('el margen del encuadre sale del alto de la pantalla (apaisado)', () => {
    const alto = vi.spyOn(globalThis.HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(360);
    try {
      abrir();
    } finally {
      alto.mockRestore();
    }

    const { zoom } = encuadreGirado(HOYO, RUMBO_DEL_HOYO, { ancho: 360, alto: 360, padding: { top: 54, bottom: 162, left: 40, right: 40 } });
    expect(mapa().jumpTo).toHaveBeenLastCalledWith(expect.objectContaining({ zoom }));
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

  it('lejos, medir tocando (19 oct: T4, T6): sin giro, desde la salida del hoyo', () => {
    abrir();
    act(() => mapa().oyentes.load());
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    mapa().fitBounds.mockClear();

    tocar(36.2893, -5.332);

    expect(mapa().fitBounds).not.toHaveBeenCalled();
    expect(mapa().fuentes.medida.data.features.map((f) => f.geometry.coordinates)).toEqual([
      [[-5.33, 36.28], [-5.332, 36.2893]],
    ]);
    expect(screen.getByText(/mapa\.hastaAhi/)).toBeInTheDocument();
    expect(screen.queryByText(/mapa\.deAhiAlGreen/)).toBeNull();
  });

  it('con mapa, lo de lejos se mide desde la salida del hoyo: a menos de 3 km de ella, se mide desde ti', () => {
    abrir();
    act(() => mapa().oyentes.load());
    // En la salida: a mitad de hoyo se mide desde ti (H1)
    act(() => gps.exito(lectura(36.2801, -5.33)));
    mapa().fitBounds.mockClear();

    tocar(36.2893, -5.332);

    expect(mapa().fuentes.medida.data.features.map((f) => f.geometry.coordinates)).toEqual([[[-5.33, 36.2801], [-5.332, 36.2893]]]);
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
    const desde = () => mapa().fuentes.medida.data.features[0].geometry.coordinates[0];
    // Lejos, desde la salida del hoyo (T4)
    expect(desde()).toEqual([-5.33, 36.28]);

    // Cerca, en la salida: desde ti
    act(() => gps.exito(lectura(36.2801, -5.33)));
    expect(desde()).toEqual([-5.33, 36.2801]);
    expect(screen.getByText(/mapa\.hastaAhi/)).toBeInTheDocument();

    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));
    expect(desde()).toEqual([-5.33, 36.28]);
    // Desde la salida, también se dice hasta ahí (T4)
    expect(screen.getByText(/mapa\.hastaAhi/)).toBeInTheDocument();
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

  it('lejos, «Céntrame» sin poder pulsarse y el recuadro con la tarjeta; cerca, desde mí', () => {
    abrir({ metros: 342 });
    act(() => gps.exito(lectura(EN_CASA.lat, EN_CASA.lon)));

    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
    expect(screen.getByRole('button', { name: 'mapa.centrame' })).toBeDisabled();

    act(() => gps.exito(lectura(36.2888, -5.332)));
    expect(screen.getByTestId('distancia-centro')).not.toHaveTextContent('342');
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
    // Sin permiso de ubicación: se marca tocando la salida y el green (L1, el
    // marcado de siempre). El de la pregunta «¿Estás en la salida?», aparte (M1-M6)
    act(() => gps.error({ code: 1 }));
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

    it('QA P2 (16 oct): solo el green sobre una línea de OSM con muchos puntos: queda con los codos de su par, y se envía', () => {
      const osm = [T, alNorte(50), alNorte(100), alNorte(160), alNorte(210), alNorte(280)];
      const { unmount, onMuestra } = marcar({ hoyo: { playLine: osm, green: null }, porMarcar: 'green', metros: 300, par: 4 });

      tocar(G);

      expect(lineaDibujada()).toHaveLength(3);
      expect(arrastrables()).toHaveLength(3);
      unmount();
      expect(onMuestra).toHaveBeenCalledTimes(1);
      expect(onMuestra.mock.calls[0][0].bends).toHaveLength(1);
      expect(onMuestra.mock.calls[0][0].greenCenter).toEqual(G);
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

    it('/code-review: sobre una línea de OSM reducida a la que le falta un codo del par, la ayuda sí sale', () => {
      marcar({ hoyo: { playLine: [T, alNorte(100), alNorte(100), alNorte(100), alNorte(280)], green: null }, porMarcar: 'green', metros: 300, par: 5 });

      tocar(G);

      expect(screen.getByText('mapa.ayudaCodo')).toBeInTheDocument();
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

    it('QA P3: si falla tras ponerlo en el mapa (al añadirle los oyentes), ese punto también se quita', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      act(() => mapa().oyentes.load());
      const { Marker } = mapas.claseMarker;
      const on = Marker.prototype.on;
      Marker.prototype.on = () => {
        throw new Error('API cambiada');
      };
      try {
        soltar(arrastrables().at(-1), alNorte(280));
      } finally {
        Marker.prototype.on = on;
      }

      expect(arrastrables()).toEqual([]);
    });

    it('QA P3 (16 oct): un doble toque en la salida (que corta el alejamiento) vuelve a alejar a la mitad de la tarjeta', () => {
      const toques = [1000, 1090];
      reloj.mockImplementation(() => toques.shift() ?? 9999);
      marcar({ metros: 300 });
      mapa().fitBounds.mockClear();

      tocar(T);
      tocar(T);

      expect(mapa().fitBounds).toHaveBeenCalledTimes(2);
      expect(mapa().fitBounds.mock.calls[1][0]).toEqual(limitesDelHoyo({ playLine: circuloAlrededor(T, 150) }));
    });

    it('QA P3: tras un green fuera de límites, un doble toque no reencuadra a la salida', () => {
      marcar({ metros: 300 });
      const a = (ms) => reloj.mockImplementation(() => ms);
      a(1000);
      tocar(T);
      mapa().fitBounds.mockClear();

      a(3000);
      tocar(alNorte(20));
      a(3090);
      tocar(alNorte(20));

      expect(screen.getByRole('alert')).toHaveTextContent('mapa.fueraDeLimites');
      expect(mapa().fitBounds).not.toHaveBeenCalled();
    });

    it('QA P3: sin metros de la tarjeta, el doble toque tampoco mueve el mapa', () => {
      const toques = [1000, 1090];
      reloj.mockImplementation(() => toques.shift() ?? 9999);
      marcar({ metros: null });
      mapa().fitBounds.mockClear();

      tocar(T);
      tocar(T);

      expect(mapa().fitBounds).not.toHaveBeenCalled();
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
      // Midiendo, la marcada no se ve (T2, 19 oct); con «Quitar» vuelve tal cual
      expect(lineaDibujada()).toBeUndefined();
      fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));
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

    // Agustín, 16 oct (Torre de Hércules, todo pares 3 con un vértice de OSM en
    // medio): la línea aprobada se enseña con los codos de su par
    it.each([
      [3, 2],
      [4, 3],
      [5, 4],
    ])('M3: una línea de OSM con muchos puntos, en un par %i, se enseña con %i puntos (los codos del par)', (par, puntos) => {
      abrir({ hoyo: hoyoCon([T, alNorte(50), alNorte(100), alNorte(150), alNorte(200), G]), par });
      act(() => mapa().oyentes.load());

      expect(lineaDibujada()).toHaveLength(puntos);
      expect(arrastrables()).toHaveLength(puntos);
    });

    it('M3: un par 3 de OSM con un vértice en medio: recta, sin codo', () => {
      abrir({ hoyo: hoyoCon([T, alEste(5, alNorte(60)), G]), par: 3 });
      act(() => mapa().oyentes.load());

      expect(lineaDibujada()).toEqual([[T.lon, T.lat], [G.lon, G.lat]]);
      expect(textos()).toEqual(['mapa.tramo {"metros":300}']);
    });

    // Agustín, 16 oct: «que haga el zoom necesario para ver el hoyo entero sin cortar pero lo más grande posible»
    it('Z1: en cuanto la ventana está pintada se encuadra el hoyo, con el panel ya medible', () => {
      const medidos = [];
      const original = globalThis.HTMLElement.prototype.getBoundingClientRect;
      globalThis.HTMLElement.prototype.getBoundingClientRect = function () {
        medidos.push(this.dataset?.testid ?? this.className);
        return original.call(this);
      };
      try {
        abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      } finally {
        globalThis.HTMLElement.prototype.getBoundingClientRect = original;
      }

      expect(mapa().jumpTo).toHaveBeenCalledWith(expect.objectContaining({ bearing: orientacionDelHoyo(hoyoCon([T, G])) }));
      expect(medidos).toContain('mapa-abajo');
    });

    it('Z1: al cargar el mapa (teselas lentas) no se vuelve a encuadrar: no quita lo que mira el jugador', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      mapa().jumpTo.mockClear();

      act(() => mapa().oyentes.load());

      expect(mapa().jumpTo).not.toHaveBeenCalled();
    });

    it('Z2: el margen es lo que tapan de verdad la cabecera y el panel de abajo, con 12 px de aire', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      const caja = (top, bottom) => () => ({ top, bottom, left: 0, right: 390, width: 390, height: bottom - top, x: 0, y: top });
      screen.getByTestId('mapa-arriba').getBoundingClientRect = caja(0, 70);
      screen.getByTestId('mapa-abajo').getBoundingClientRect = caja(560, 844);
      const contenedor = mapa().opciones.container;
      contenedor.getBoundingClientRect = caja(0, 844);
      Object.defineProperty(contenedor, 'clientHeight', { value: 844, configurable: true });
      mapa().easeTo.mockClear();
      mapa().jumpTo.mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'mapa.verHoyo' }));

      const esperado = encuadreGirado(hoyoCon([T, G]), orientacionDelHoyo(hoyoCon([T, G])), { ancho: 360, alto: 844, padding: { top: 82, bottom: 296, left: 40, right: 40 } });
      expect(mapa().easeTo.mock.calls[0][0]).toEqual({ center: [esperado.center.lon, esperado.center.lat], zoom: esperado.zoom, bearing: orientacionDelHoyo(hoyoCon([T, G])) });
    });

    it('Z3: si con lo medido no cabría nada (apaisado), los márgenes de siempre', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      const caja = (top, bottom) => () => ({ top, bottom, left: 0, right: 700, width: 700, height: bottom - top, x: 0, y: top });
      screen.getByTestId('mapa-arriba').getBoundingClientRect = caja(0, 70);
      screen.getByTestId('mapa-abajo').getBoundingClientRect = caja(120, 360);
      const contenedor = mapa().opciones.container;
      contenedor.getBoundingClientRect = caja(0, 360);
      Object.defineProperty(contenedor, 'clientHeight', { value: 360, configurable: true });
      mapa().easeTo.mockClear();
      mapa().jumpTo.mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'mapa.verHoyo' }));

      const esperado = encuadreGirado(hoyoCon([T, G]), orientacionDelHoyo(hoyoCon([T, G])), { ancho: 360, alto: 360, padding: { top: 54, bottom: 162, left: 40, right: 40 } });
      expect(mapa().easeTo.mock.calls[0][0].zoom).toBeCloseTo(esperado.zoom, 9);
    });

    it('Z5: si el panel de abajo crece después (el recuadro, avisos), se vuelve a encuadrar', () => {
      const observados = [];
      vi.stubGlobal('ResizeObserver', class {
        constructor(fn) { this.fn = fn; observados.push(this); }
        observe() {}
        disconnect() {}
      });
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      mapa().easeTo.mockClear();
      mapa().jumpTo.mockClear();

      act(() => observados.at(-1).fn());

      expect(mapa().jumpTo).toHaveBeenCalledTimes(1);
    });

    it('Z5: pero no si el jugador ya movió el mapa o tocó para medir', () => {
      const observados = [];
      vi.stubGlobal('ResizeObserver', class {
        constructor(fn) { this.fn = fn; observados.push(this); }
        observe() {}
        disconnect() {}
      });
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      act(() => mapa().oyentes.click({ lngLat: { lat: alNorte(150).lat, lng: T.lon } }));
      mapa().easeTo.mockClear();
      mapa().jumpTo.mockClear();

      act(() => observados.at(-1).fn());
      act(() => mapa().oyentes.movestart({ originalEvent: {} }));
      act(() => observados.at(-1).fn());

      expect(mapa().jumpTo).not.toHaveBeenCalled();
    });

    it('/code-review: la cámara del encuadre nunca lleva padding (no se queda guardado en el mapa)', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      fireEvent.click(screen.getByRole('button', { name: 'mapa.verHoyo' }));

      for (const [camara] of [...mapa().jumpTo.mock.calls, ...mapa().easeTo.mock.calls]) expect(camara).not.toHaveProperty('padding');
    });

    it('Z4: si no se puede medir (jsdom, sin pintar), los márgenes de siempre', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      mapa().easeTo.mockClear();
      mapa().jumpTo.mockClear();

      fireEvent.click(screen.getByRole('button', { name: 'mapa.verHoyo' }));

      const esperado = encuadreGirado(hoyoCon([T, G]), orientacionDelHoyo(hoyoCon([T, G])), { ancho: 360, alto: 640, padding: { top: 90, bottom: 288, left: 40, right: 40 } });
      expect(mapa().easeTo.mock.calls[0][0].zoom).toBeCloseTo(esperado.zoom, 9);
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

    it('M5: sin metros, un dogleg de OSM (con vértices) mide por su esquina, no atajando', () => {
      const esquina = alNorte(240);
      const verde = alEste(160, esquina);
      const osm = [T, alNorte(40), alNorte(80), alNorte(120), alNorte(160), alNorte(200), esquina, alEste(40, esquina), alEste(80, esquina), alEste(120, esquina), verde];
      abrir({ hoyo: hoyoCon(osm, { front: alEste(150, esquina), center: verde, back: alEste(170, esquina) }), par: 4, metros: null });
      act(() => mapa().oyentes.load());

      expect(lineaDibujada()).toEqual([[T.lon, T.lat], [esquina.lon, esquina.lat], [verde.lon, verde.lat]]);
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('400');
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

    it('S5: la de un mapa con muchos puntos, ya con los codos de su par, sí se envía al moverla', () => {
      const onMuestra = vi.fn();
      const { unmount } = abrir({ hoyo: hoyoCon([T, alNorte(50), alNorte(100), alNorte(150), G]), par: 4, recoge: true, onMuestra });
      act(() => mapa().oyentes.load());
      soltar(arrastrables()[1], alEste(20, alNorte(150)));

      unmount();

      expect(onMuestra).toHaveBeenCalledTimes(1);
      expect(onMuestra.mock.calls[0][0].bends).toHaveLength(1);
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
      // V2 (17 oct): la salida se lleva a los 342 m de mi tarjeta
      expect(textos()).toEqual(['mapa.tramo {"metros":342}']);
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

    it('QA P3 (16 oct): si poner los puntos falla a medias, no queda ningún punto suelto en el mapa', () => {
      abrir({ hoyo: hoyoCon([T, G]), par: 4 });
      act(() => mapa().oyentes.load());
      const original = globalThis.document.createElement.bind(globalThis.document);
      let divs = 0;
      const espia = vi.spyOn(globalThis.document, 'createElement').mockImplementation((tag) => {
        // El primer punto se crea; el segundo revienta
        if (tag === 'div' && (divs += 1) === 2) throw new Error('API cambiada');
        return original(tag);
      });
      try {
        soltar(arrastrables().at(-1), alNorte(280));
      } finally {
        espia.mockRestore();
      }

      expect(arrastrables()).toEqual([]);
    });

    it('QA (16 oct): si poner los puntos falla (la librería cambia), el mapa sigue y el fallo se apunta', () => {
      const original = globalThis.document.createElement.bind(globalThis.document);
      abrir({ hoyo: hoyoCon([T, G]), par: 3 });
      act(() => mapa().oyentes.load());
      const espia = vi.spyOn(globalThis.document, 'createElement').mockImplementation((tag) => {
        if (tag === 'div') throw new Error('API cambiada');
        return original(tag);
      });
      try {
        soltar(arrastrables().at(-1), alNorte(280));
      } finally {
        espia.mockRestore();
      }

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(apuntado.captureError).toHaveBeenCalledWith(expect.any(Error), { tags: { modulo: 'mapa-de-hoyos' } });
    });

    it('CR10: una línea de OSM larga, ya con los codos de su par: se arrastran la salida, su codo y el green', () => {
      abrir({ hoyo: hoyoCon([T, alNorte(50), alNorte(100), alNorte(150), G]), par: 4 });
      act(() => mapa().oyentes.load());

      expect(arrastrables()).toHaveLength(3);
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
      // A 30 m de la salida: se ve el hoyo entero (H2)
      act(() => gps.exito(lectura(alNorte(30).lat, T.lon)));

      tocar(alNorte(150));

      // Con el punto, la línea del hoyo sin sus metros, para que no se pisen (19 oct: T2)
      expect(textos()).toEqual([]);
      const medida = vivas().filter((m) => m.opciones.element?.dataset?.tramo === 'medida').map((m) => m.opciones.element.textContent);
      expect(medida).toEqual(['mapa.tramo {"metros":120}']);
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

    it('T5: una línea de más de tres tramos (la de OSM de un hoyo aprobado sin green), la lista', () => {
      abrir({ hoyo: { playLine: [T, alNorte(50), alNorte(100), alNorte(150), G], green: null } });

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


// Agustín, 17 oct (BE #575): al abrir un hoyo sin línea, «¿Estás en la salida?»;
// y el recuadro, desde donde estás si el GPS es bueno y estás en el hoyo
//
// | Caso | Situación                                         | Qué pasa                                                   |
// |------|---------------------------------------------------|------------------------------------------------------------|
// | M1   | hoyo sin línea, en el campo                       | se pregunta «¿Estás en la salida?»                          |
// | M2   | Sí, GPS ≤ 20 m                                    | la salida es mi posición; se pide el green; al tocarlo, la línea con los codos del par; al cerrar, la muestra completa |
// | M3   | Sí, el hoyo ya tiene un green (de otra muestra)   | la línea sale directa de mi posición a ese green, y se envía |
// | M4   | Sí, GPS > 20 m o sin posición aún                 | «No te localizamos bien: toca dónde está la salida»; luego el green |
// | M5   | No                                                | se pide el green; al cerrar, la muestra solo green          |
// | M6   | No, el hoyo ya tiene green                        | nada que pedir; nada se envía                               |
// | L1   | lejos del campo, o sin permiso de ubicación       | sin pregunta: toca la salida y el green, como siempre       |
// | B1   | GPS ≤ 20 m y a ≤ 750 m del green                  | el recuadro desde mi posición, «desde tu posición»          |
// | B2   | si no                                             | la tarjeta, «desde tu barra»                                |
describe('MapaDelHoyo — marcar con el GPS y el recuadro desde ti (17 oct)', () => {
  const M_POR_GRADO = (6371008.8 * Math.PI) / 180;
  const T = { lat: 36.28, lon: -5.33 };
  const alNorte = (m, de = T) => ({ lat: de.lat + m / M_POR_GRADO, lon: de.lon });
  const tocar = (p) => act(() => mapa().oyentes.click({ lngLat: { lat: p.lat, lng: p.lon } }));
  const lineaDibujada = () => mapa().fuentes.marcado.data.features.find((f) => f.properties.tipo === 'linea')?.geometry.coordinates;
  const si = () => fireEvent.click(screen.getByRole('button', { name: 'mapa.si' }));
  const no = () => fireEvent.click(screen.getByRole('button', { name: 'mapa.no' }));
  const hoyoEntero = () => fireEvent.click(screen.getByRole('button', { name: 'mapa.marcarEntero' }));
  const enLaSalida = (precision = 5) => act(() => gps.exito(lectura(T.lat, T.lon, precision)));
  const abrirSinLinea = (props = {}) => {
    const onMuestra = props.onMuestra ?? vi.fn();
    const r = abrir({ hoyo: null, porMarcar: 'salida', recoge: true, onMuestra, par: 4, metros: 300, ...props });
    act(() => mapa().oyentes.load());
    return { ...r, onMuestra };
  };
  // Un hoyo con solo el green de una muestra (sin salida)
  const conGreenSuelto = (props = {}) => abrirSinLinea({ hoyo: { playLine: [], green: { center: alNorte(300) } }, porMarcar: 'salidaAlGreen', ...props });

  let gps;
  let reloj;
  beforeEach(() => {
    mapas.length = 0;
    mapas.marcas = [];
    mapas.sinWebgl = false;
    centro.valor = T;
    gps = gpsFalso();
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gps });
    let ahora = 0;
    reloj = vi.spyOn(globalThis.performance, 'now').mockImplementation(() => (ahora += 1000));
  });
  afterEach(() => {
    reloj.mockRestore();
    vi.unstubAllGlobals();
  });

  // Agustín, 17-18 oct: el mapa se orienta como se juega
  //
  // | Caso | Situación                                    | Hacia dónde mira                                         |
  // |------|----------------------------------------------|----------------------------------------------------------|
  // | O1   | hoyo con línea, en la salida o sin GPS bueno | par 3 al green; par 4/5 al primer codo; sin codos, al green |
  // | O2   | a mitad de hoyo (H1)                         | de ti al siguiente punto de la línea; no cambia al andar  |
  // | O3   | llegas a la salida (H12) o «Ver hoyo»         | la del hoyo (O1)                                         |
  // | O4   | sin línea, tras el «No» con green             | de ti al green                                           |
  // | O5   | marcas la salida y el green                   | O1, con animación, encuadrando la línea                  |
  // | O6   | tras girar                                    | sin giro con los dedos                                   |
  // | O7   | arrastrar la línea                            | no gira; «Ver hoyo» reencuadra con la nueva              |
  // | O8   | solo el green sin GPS bueno                   | norte arriba                                             |
  // | O9   | proponiendo un reporte                        | no gira                                                  |
  describe('O: orientar el hoyo', () => {
    const alEste = (m, de = T) => ({ lat: de.lat, lon: de.lon + m / (M_POR_GRADO * Math.cos((de.lat * Math.PI) / 180)) });
    const giros = () => [...mapa().easeTo.mock.calls, ...mapa().jumpTo.mock.calls].map(([c]) => c.bearing).filter((b) => b !== undefined);
    const ultimoGiro = () => mapa().easeTo.mock.calls.at(-1)?.[0].bearing;
    const desde = (p, precision = 5) => act(() => gps.exito(lectura(p.lat, p.lon, precision)));
    // Salida al sur, codo 200 m al norte y green 250 m al este del codo
    const CODO = alNorte(200);
    const VERDE = alEste(250, CODO);
    const conCodo = { playLine: [T, CODO, VERDE], green: { front: alEste(240, CODO), center: VERDE, back: alEste(260, CODO) } };
    const abrirCon = (props = {}) => {
      const r = abrir({ hoyo: conCodo, par: 4, porMarcar: null, recoge: true, onMuestra: vi.fn(), ...props });
      act(() => mapa().oyentes.load());
      return r;
    };

    it('O1: par 4 con codo, al abrir mira de la salida al codo', () => {
      abrirCon();

      expect(mapa().opciones.bearing).toBeCloseTo(rumbo(T, CODO), 6);
      expect(giros().at(-1)).toBeCloseTo(rumbo(T, CODO), 6);
    });

    it('O1: par 3, de la salida al green', () => {
      abrirCon({ par: 3 });

      expect(mapa().opciones.bearing).toBeCloseTo(rumbo(T, VERDE), 6);
    });

    it('O2: a mitad de hoyo antes del codo, de ti al codo', () => {
      abrirCon();
      const aqui = alNorte(100);

      desde(aqui);

      expect(ultimoGiro()).toBeCloseTo(rumbo(aqui, CODO), 6);
    });

    it('O2: pasado el codo, de ti al green; andando no cambia', () => {
      abrirCon();
      const aqui = alEste(80, CODO);
      desde(aqui);
      expect(ultimoGiro()).toBeCloseTo(rumbo(aqui, VERDE), 6);
      const giradas = mapa().easeTo.mock.calls.length;

      desde(alEste(150, CODO));

      expect(mapa().easeTo.mock.calls.length).toBe(giradas);
    });

    it('O3: llegando a la salida, la del hoyo', () => {
      abrirCon();
      const aqui = alEste(40, alNorte(100));
      desde(aqui);
      expect(ultimoGiro()).toBeCloseTo(rumbo(aqui, CODO), 6);

      desde(alNorte(10));

      expect(ultimoGiro()).toBeCloseTo(rumbo(T, CODO), 6);
    });

    it('O3: «Ver hoyo» a mitad de hoyo, la del hoyo', () => {
      abrirCon();
      desde(alNorte(100));

      fireEvent.click(screen.getByRole('button', { name: /mapa\.verHoyo/ }));

      expect(ultimoGiro()).toBeCloseTo(rumbo(T, CODO), 6);
    });

    it('O4/O6: sin línea, tras el «No» con el green, de ti al green, y ya no se gira con los dedos', () => {
      const green = alEste(150);
      conGreenSuelto({ hoyo: { playLine: [], green: { center: green } } });
      desde(T);

      no();

      expect(ultimoGiro()).toBeCloseTo(rumbo(T, green), 6);
      expect(mapa().dragRotate.disable).toHaveBeenCalled();
      expect(mapa().touchZoomRotate.disableRotation).toHaveBeenCalled();
      expect(mapa().keyboard.disableRotation).toHaveBeenCalled();
    });

    it('O2: orientado desde ti, que crezca el panel vuelve a encuadrar desde ti, no el hoyo', () => {
      const observados = [];
      vi.stubGlobal('ResizeObserver', class {
        constructor(fn) { this.fn = fn; observados.push(this); }
        observe() {}
        disconnect() {}
      });
      abrirCon();
      // A menos de 200 m del green: sin codo (que ya contaría como tocar)
      const aqui = alEste(100, CODO);
      desde(aqui);
      mapa().jumpTo.mockClear();

      act(() => observados.at(-1).fn());

      expect(mapa().jumpTo).toHaveBeenCalledTimes(1);
      expect(mapa().jumpTo.mock.calls[0][0].bearing).toBeCloseTo(rumbo(aqui, VERDE), 6);
    });

    it('C2: con el codo sin tocar a la vista, que crezca el panel no vuelve a encuadrar (cuenta como tocado)', () => {
      const observados = [];
      vi.stubGlobal('ResizeObserver', class {
        constructor(fn) { this.fn = fn; observados.push(this); }
        observe() {}
        disconnect() {}
      });
      abrirCon();
      // A más de 200 m del green: con codo
      desde(alNorte(100));
      mapa().jumpTo.mockClear();

      act(() => observados.at(-1).fn());

      expect(mapa().jumpTo).not.toHaveBeenCalled();
    });

    it('O2: el encuadre desde ti incluye el punto hacia el que mira', () => {
      // Un codo más allá del green (en lo que se mira): fuera de la caja de ti al green
      const lejano = alNorte(300);
      const verde = alEste(150, alNorte(220));
      abrirCon({ hoyo: { playLine: [T, lejano, verde], green: { front: verde, center: verde, back: verde } } });
      const aqui = alNorte(100);

      desde(aqui);

      const padding = { top: 90, bottom: 288, left: 40, right: 40 };
      const conCodo = encuadreGirado({ playLine: [aqui, lejano, verde], green: null }, rumbo(aqui, lejano), { ancho: 360, alto: 640, padding });
      const sinCodo = encuadreGirado({ playLine: [aqui, verde], green: null }, rumbo(aqui, lejano), { ancho: 360, alto: 640, padding });
      expect(conCodo.zoom).not.toBeCloseTo(sinCodo.zoom, 3);
      expect(mapa().easeTo.mock.calls.at(-1)[0].zoom).toBeCloseTo(conCodo.zoom, 6);
    });

    it('O2: si el jugador ya movió el mapa, el primer GPS bueno no se lo quita', () => {
      abrirCon();
      act(() => mapa().oyentes.movestart({ originalEvent: {} }));

      desde(alNorte(100));

      expect(mapa().easeTo).not.toHaveBeenCalled();
    });

    it('O3: llegando a la salida con el mapa movido, tampoco', () => {
      abrirCon();
      desde(alEste(40, alNorte(100)));
      act(() => mapa().oyentes.movestart({ originalEvent: {} }));
      const giradas = mapa().easeTo.mock.calls.length;

      desde(alNorte(10));

      expect(mapa().easeTo.mock.calls.length).toBe(giradas);
    });

    it('O5/O6: marcando la salida y el green, gira hacia el codo del par y encuadra; sale «Ver hoyo»', () => {
      abrirSinLinea();
      enLaSalida();
      si();
      expect(mapa().easeTo).not.toHaveBeenCalled();

      tocar(alEste(300));

      const codo = lineaDibujada()[1];
      expect(ultimoGiro()).toBeCloseTo(rumbo(T, { lat: codo[1], lon: codo[0] }), 6);
      expect(mapa().easeTo.mock.calls.at(-1)[0].zoom).toEqual(expect.any(Number));
      expect(mapa().dragRotate.disable).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /mapa\.verHoyo/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /mapa\.norte/ })).toBeNull();
    });

    it('Revisor: si el primer GPS llega tras el «No», centrarlo no corta el giro', () => {
      const green = alEste(150);
      conGreenSuelto({ hoyo: { playLine: [], green: { center: green } } });
      no();

      desde(T);

      const giro = mapa().easeTo.mock.calls.findIndex(([c]) => c.bearing !== undefined);
      expect(giro).toBeGreaterThanOrEqual(0);
      const despues = mapa().jumpTo.mock.invocationCallOrder.filter((n) => n > mapa().easeTo.mock.invocationCallOrder[giro]);
      expect(despues).toEqual([]);
    });

    it('Revisor: marcado sin GPS, el primer GPS no deshace el encuadre', () => {
      abrirSinLinea({ par: 3 });
      act(() => gps.error({ code: 1 }));
      tocar(T);
      tocar(alEste(150));
      expect(ultimoGiro()).toBeCloseTo(rumbo(T, alEste(150)), 6);
      mapa().jumpTo.mockClear();

      desde(T);

      expect(mapa().jumpTo).not.toHaveBeenCalled();
    });

    it('Revisor: orientado, que llegue tarde el centro del campo tampoco mueve el mapa', () => {
      centro.valor = null;
      abrirSinLinea({ par: 3 });
      act(() => gps.error({ code: 1 }));
      tocar(T);
      tocar(alEste(150));
      mapa().jumpTo.mockClear();

      centro.valor = alEste(10);
      desde(T, 25);

      expect(mapa().jumpTo).not.toHaveBeenCalled();
    });

    it('Revisor: proponiendo un reporte, llegar a la salida no gira; al cancelar, sí', () => {
      abrirCon({ onReporte: vi.fn() });
      desde(alEste(40, alNorte(100)));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.motivos.WRONG_LINE' }));
      tocar(alEste(60));
      tocar(VERDE);
      const giradas = mapa().easeTo.mock.calls.length;

      desde(alNorte(10));
      expect(mapa().easeTo.mock.calls.length).toBe(giradas);

      fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));
      expect(ultimoGiro()).toBeCloseTo(rumbo(T, CODO), 6);
    });

    it('Revisor: «Ver hoyo» proponiendo un reporte encuadra el hoyo de al abrir, no la propuesta', () => {
      abrirCon({ onReporte: vi.fn() });
      desde(alNorte(10));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.motivos.WRONG_LINE' }));
      tocar(alEste(60));
      tocar(VERDE);

      fireEvent.click(screen.getByRole('button', { name: /mapa\.verHoyo/ }));

      expect(ultimoGiro()).toBeCloseTo(rumbo(T, CODO), 6);
    });

    it('CodeRabbit: marcar orienta aunque el jugador haya movido el mapa para buscar el green', () => {
      abrirSinLinea({ par: 3 });
      enLaSalida();
      si();
      act(() => mapa().oyentes.movestart({ originalEvent: {} }));

      tocar(alEste(150));

      expect(ultimoGiro()).toBeCloseTo(rumbo(T, alEste(150)), 6);
      expect(mapa().dragRotate.disable).toHaveBeenCalled();
    });

    it('CodeRabbit: con el green conocido, marcar la salida también orienta tras mover el mapa', () => {
      conGreenSuelto({ par: 3, hoyo: { playLine: [], green: { center: alEste(300) } } });
      enLaSalida();
      act(() => mapa().oyentes.movestart({ originalEvent: {} }));

      si();

      expect(ultimoGiro()).toBeCloseTo(rumbo(T, alEste(300)), 6);
    });

    it('CodeRabbit: tras «Ver hoyo», que crezca el panel encuadra el hoyo, no «desde ti»', () => {
      const observados = [];
      vi.stubGlobal('ResizeObserver', class {
        constructor(fn) { this.fn = fn; observados.push(this); }
        observe() {}
        disconnect() {}
      });
      abrirCon();
      desde(alEste(100, CODO));
      fireEvent.click(screen.getByRole('button', { name: /mapa\.verHoyo/ }));
      mapa().jumpTo.mockClear();

      act(() => observados.at(-1).fn());

      expect(mapa().jumpTo.mock.calls.at(-1)[0].bearing).toBeCloseTo(rumbo(T, CODO), 6);
    });

    it('O5: par 3 marcado, de la salida al green', () => {
      abrirSinLinea({ par: 3 });
      enLaSalida();
      si();

      tocar(alEste(150));

      expect(ultimoGiro()).toBeCloseTo(rumbo(T, alEste(150)), 6);
    });

    it('O5: con el green conocido, la salida basta y gira igual', () => {
      conGreenSuelto({ par: 3, hoyo: { playLine: [], green: { center: alEste(300) } } });
      enLaSalida();

      si();

      expect(ultimoGiro()).toBeCloseTo(rumbo(T, alEste(300)), 6);
    });

    it('O7: arrastrar la salida no gira; «Ver hoyo» reencuadra con la nueva', () => {
      abrirSinLinea({ par: 3 });
      enLaSalida();
      si();
      tocar(alEste(300));
      const giradas = mapa().easeTo.mock.calls.length;
      const salida = mapas.marcas.find((m) => !m.quitada && m.opciones.draggable && m.p[1] === T.lat);
      const nueva = alNorte(-50);
      act(() => {
        salida.setLngLat([nueva.lon, nueva.lat]);
        salida.oyentes.dragend({ target: salida });
      });
      expect(mapa().easeTo.mock.calls.length).toBe(giradas);

      fireEvent.click(screen.getByRole('button', { name: /mapa\.verHoyo/ }));

      expect(ultimoGiro()).toBeCloseTo(rumbo(nueva, alEste(300)), 6);
    });

    it('O8: solo el green sin GPS bueno, norte arriba', () => {
      abrirSinLinea();
      desde(T, 25);
      no();

      tocar(alEste(300));

      expect(giros()).toEqual([]);
    });

    it('O9: proponiendo una línea en un reporte, no gira', () => {
      abrirCon({ onReporte: vi.fn() });
      desde(alNorte(10));
      const giradas = mapa().easeTo.mock.calls.length;

      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.motivos.WRONG_LINE' }));
      tocar(alNorte(5));
      tocar(VERDE);

      expect(mapa().easeTo.mock.calls.length).toBe(giradas);
    });
  });

  it('M1: en un hoyo sin línea se pregunta si estás en la salida', () => {
    abrirSinLinea();
    enLaSalida();

    expect(screen.getByText('mapa.preguntaSalida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'mapa.si' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'mapa.no' })).toBeInTheDocument();
    expect(screen.queryByText('mapa.pideSalida')).toBeNull();
  });

  it('M1: mientras se pregunta, tocar el mapa no marca ni mide nada', () => {
    abrirSinLinea();
    enLaSalida();

    tocar(alNorte(300));

    expect(lineaDibujada()).toBeUndefined();
    expect(mapa().fuentes.medida.data.features).toEqual([]);
    expect(screen.queryByRole('button', { name: 'mapa.quitarPunto' })).toBeNull();
  });

  it('M2: Sí con buen GPS: mi posición es la salida, se pide el green y sale la línea con el codo del par', () => {
    const { unmount, onMuestra } = abrirSinLinea();
    enLaSalida(12);

    si();
    expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
    tocar(alNorte(300));

    expect(lineaDibujada()).toHaveLength(3);
    expect(lineaDibujada()[0]).toEqual([T.lon, T.lat]);
    unmount();
    expect(onMuestra).toHaveBeenCalledTimes(1);
    expect(onMuestra.mock.calls[0][0].tee).toEqual(T);
    expect(onMuestra.mock.calls[0][0].bends).toHaveLength(1);
  });

  it('M3: Sí y el hoyo ya tiene green: la línea sale directa de mí a ese green, y se envía completa', () => {
    const { unmount, onMuestra } = conGreenSuelto({ par: 3 });
    enLaSalida();

    si();

    expect(lineaDibujada()).toEqual([[T.lon, T.lat], [T.lon, alNorte(300).lat]]);
    expect(screen.queryByText('mapa.pideGreen')).toBeNull();
    unmount();
    expect(onMuestra.mock.calls[0][0]).toMatchObject({ tee: T, bends: [], greenCenter: alNorte(300) });
  });

  it.each([
    ['con 25 m de error', () => enLaSalida(25)],
    ['sin posición todavía', () => {}],
  ])('M4: Sí %s: se pide tocar la salida, y luego el green', (_caso, gpsAhora) => {
    const { unmount, onMuestra } = abrirSinLinea();
    gpsAhora();

    si();
    expect(screen.getByText('mapa.malGps')).toBeInTheDocument();
    tocar(alNorte(10));
    expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
    tocar(alNorte(300));

    unmount();
    expect(onMuestra.mock.calls[0][0].tee).toEqual(alNorte(10));
  });

  it('M4: con un green ya puesto, tocar la salida basta', () => {
    const { unmount, onMuestra } = conGreenSuelto({ par: 3 });
    enLaSalida(40);

    si();
    tocar(alNorte(10));

    unmount();
    expect(onMuestra.mock.calls[0][0]).toMatchObject({ tee: alNorte(10), greenCenter: alNorte(300) });
  });

  it('M5: No: se pide el green, se mide desde mí y al cerrar sale solo el green', () => {
    const { unmount, onMuestra } = abrirSinLinea();
    act(() => gps.exito(lectura(alNorte(150).lat, T.lon, 6)));

    no();
    expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
    tocar(alNorte(300));

    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('150');
    expect(screen.getByText('mapa.desdeTuPosicion')).toBeInTheDocument();
    unmount();
    expect(onMuestra).toHaveBeenCalledTimes(1);
    expect(onMuestra.mock.calls[0][0]).toMatchObject({ tee: null, bends: [], greenCenter: alNorte(300) });
  });

  it('M5: No y no se marca nada: no se envía nada', () => {
    const { unmount, onMuestra } = abrirSinLinea();
    enLaSalida();

    no();
    unmount();

    expect(onMuestra).not.toHaveBeenCalled();
  });

  it('M6: No y el hoyo ya tiene green: nada que pedir, los metros a ese green y nada se envía', () => {
    const { unmount, onMuestra } = conGreenSuelto();
    act(() => gps.exito(lectura(alNorte(100).lat, T.lon, 6)));

    no();

    expect(screen.queryByText('mapa.pideGreen')).toBeNull();
    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('200');
    unmount();
    expect(onMuestra).not.toHaveBeenCalled();
  });

  it.each([
    ['lejos del campo', () => act(() => gps.exito(lectura(40.4, -3.7)))],
    ['sin permiso de ubicación', () => act(() => gps.error({ code: 1 }))],
  ])('L1: %s, sin pregunta: toca la salida y el green, y se envía', (_caso, gpsAhora) => {
    const { unmount, onMuestra } = abrirSinLinea();
    gpsAhora();

    expect(screen.queryByText('mapa.preguntaSalida')).toBeNull();
    expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
    tocar(alNorte(10));
    tocar(alNorte(300));

    unmount();
    expect(onMuestra.mock.calls[0][0].tee).toEqual(alNorte(10));
  });

  it('L1: si te pregunta y resulta que estás lejos, la pregunta se va y se marca tocando', () => {
    abrirSinLinea();
    expect(screen.getByText('mapa.preguntaSalida')).toBeInTheDocument();

    act(() => gps.exito(lectura(40.4, -3.7)));

    expect(screen.queryByText('mapa.preguntaSalida')).toBeNull();
    expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
  });

  it('un hoyo con línea no pregunta nada', () => {
    abrir({ hoyo: { playLine: [T, alNorte(300)], green: { front: alNorte(290), center: alNorte(300), back: alNorte(310) } }, porMarcar: null, recoge: true, onMuestra: vi.fn() });
    enLaSalida();

    expect(screen.queryByText('mapa.preguntaSalida')).toBeNull();
  });

  // Revisión del 17 oct
  it('R: contestar «No» o «Sí» con mal GPS ya cuenta como empezar (lo que se ve no se rehace)', () => {
    const onEmpezar = vi.fn();
    abrirSinLinea({ onEmpezar });
    enLaSalida(40);

    si();

    expect(onEmpezar).toHaveBeenCalledTimes(1);
  });

  it('R: «No» también cuenta como empezar', () => {
    const onEmpezar = vi.fn();
    abrirSinLinea({ onEmpezar });
    enLaSalida();

    no();

    expect(onEmpezar).toHaveBeenCalledTimes(1);
  });

  it('R: «Sí» con el green conocido fuera de 40-750 m: se avisa y se pide tocar la salida', () => {
    const { unmount, onMuestra } = conGreenSuelto({ hoyo: { playLine: [], green: { center: alNorte(900) } } });
    enLaSalida();

    si();

    expect(screen.getByText('mapa.fueraDeLimites')).toBeInTheDocument();
    expect(screen.queryByText('mapa.preguntaSalida')).toBeNull();
    tocar(alNorte(500));
    unmount();
    expect(onMuestra.mock.calls[0][0].tee).toEqual(alNorte(500));
  });

  it('R: tras «Ahora no», «Marcar hoyo» vuelve a preguntar si estás en la salida', () => {
    abrirSinLinea();
    enLaSalida();
    no();

    fireEvent.click(screen.getByRole('button', { name: 'mapa.ahoraNo' }));
    fireEvent.click(screen.getByRole('button', { name: /mapa\.marcarHoyo/ }));

    expect(screen.getByText('mapa.preguntaSalida')).toBeInTheDocument();
  });

  it('R: con «No», un green a más de 750 m de ti no vale: se avisa', () => {
    const { unmount, onMuestra } = abrirSinLinea();
    enLaSalida();
    no();

    tocar(alNorte(900));

    expect(screen.getByText('mapa.fueraDeLimites')).toBeInTheDocument();
    unmount();
    expect(onMuestra).not.toHaveBeenCalled();
  });

  it('R: el green marcado con «No» se puede arrastrar, y sale el de donde lo dejas', () => {
    const { unmount, onMuestra } = abrirSinLinea();
    act(() => gps.exito(lectura(alNorte(150).lat, T.lon, 5)));
    no();
    tocar(alNorte(300));

    const green = mapas.marcas.filter((m) => !m.quitada && m.opciones.draggable);
    expect(green).toHaveLength(1);
    act(() => {
      green[0].setLngLat([T.lon, alNorte(320).lat]);
      green[0].oyentes.dragend({ target: green[0] });
    });

    unmount();
    expect(onMuestra.mock.calls.at(-1)[0].greenCenter).toEqual({ lat: alNorte(320).lat, lon: T.lon });
  });

  // Agustín, 18 oct: el «No» a «¿Estás en la salida?» enseña ya la distancia
  // desde ti al green, con un codo si pasa de 200 m
  //
  // | Caso | Situación                                     | Qué pasa                                                        |
  // |------|-----------------------------------------------|-----------------------------------------------------------------|
  // | D1   | green conocido, GPS bueno, a ≤ 200 m          | «No»: la línea amarilla de mí al green con sus metros; sin botones; enlace «Marcar el hoyo entero» |
  // | D2   | igual, a más de 200 m                         | con un codo en medio: dos tramos con sus metros                 |
  // | D3   | el codo                                       | se arrastra o se toca otro sitio, y los tramos se rehacen; «Quitar» lo quita y la línea va directa |
  // | D4   | andando                                       | la línea sale siempre de mí; el codo no se mueve                |
  // | D5   | GPS no tan preciso (> 20 m)                   | sin línea: «Buscando señal GPS…»; sale en cuanto es bueno       |
  // | D6   | hoyo sin nada                                 | «No»: se pide el green; al tocarlo, muestra solo green y la línea de D1/D2 |
  // | D7   | la línea desde mí                             | no se envía como muestra                                        |
  // | D8   | «Marcar el hoyo entero»                       | con green, solo la salida; sin green, la salida y el green      |
  // | D9   | lejos o sin ubicación                         | sin pregunta (L1)                                               |
  // | D10  | a 200 m justos                                | sin codo                                                        |
  const medida = () => mapa().fuentes.medida.data.features.map((f) => f.geometry.coordinates);
  const elCodo = () => mapas.marcas.filter((m) => !m.quitada && m.opciones.element?.className.startsWith('h-3.5 ') && m.opciones.element.className.includes('bg-yellow-400'));
  const en = (p) => [p.lon, p.lat];
  const desde = (m, precision = 5) => act(() => gps.exito(lectura(alNorte(m).lat, T.lon, precision)));
  const G300 = alNorte(300);

  it('D1: con el green conocido y a ≤ 200 m, «No» pinta la línea de mí al green, sin botones', () => {
    conGreenSuelto();
    desde(150);

    no();

    expect(screen.queryByText('mapa.preguntaSalida')).toBeNull();
    expect(screen.queryByText('mapa.pideGreen')).toBeNull();
    expect(screen.queryByRole('button', { name: 'mapa.soloDistancia' })).toBeNull();
    expect(medida()).toEqual([[en(alNorte(150)), en(G300)]]);
    expect(elCodo()).toHaveLength(0);
    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('150');
    expect(screen.getByRole('button', { name: 'mapa.marcarEntero' })).toBeInTheDocument();
  });

  it('D1: el foco pasa al enlace «Marcar el hoyo entero», una vez', () => {
    conGreenSuelto();
    desde(150);

    no();
    const enlace = screen.getByRole('button', { name: 'mapa.marcarEntero' });
    expect(enlace).toHaveFocus();
    enlace.blur();
    desde(160);

    expect(enlace).not.toHaveFocus();
  });

  it('D2: a más de 200 m, la línea sale con un codo en medio, sin tocar: un tramo (C2, 20 oct)', () => {
    conGreenSuelto();
    desde(0);

    no();

    expect(elCodo()).toHaveLength(1);
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(150).lat, 9);
    expect(medida()).toEqual([[en(T), en(G300)]]);
    // Sin tocar no hay «Quitar» (C9)
    expect(screen.queryByRole('button', { name: 'mapa.quitarPunto' })).toBeNull();
  });

  it('D10: a 200 m justos, sin codo', () => {
    conGreenSuelto();
    desde(100);

    no();

    expect(elCodo()).toHaveLength(0);
    expect(medida()).toHaveLength(1);
  });

  it('D3: el codo se arrastra y los tramos van a donde se deja', () => {
    conGreenSuelto();
    desde(0);
    no();

    const [codo] = elCodo();
    expect(codo.opciones.draggable).toBe(true);
    act(() => {
      codo.setLngLat([T.lon, alNorte(250).lat]);
      codo.oyentes.dragend({ target: codo });
    });

    expect(medida()[0][1]).toEqual([T.lon, alNorte(250).lat]);
    expect(medida()[1][0]).toEqual([T.lon, alNorte(250).lat]);
  });

  it('D3 (M1, 24 oct): tocar otro sitio mide solo hasta allí; el codo se esconde y vuelve igual', () => {
    conGreenSuelto();
    desde(0);
    no();
    const codo = elCodo()[0].p;

    tocar(alNorte(200));

    expect(elCodo()).toHaveLength(0);
    expect(medida()).toEqual([[en(T), en(alNorte(200))]]);
    fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));
    expect(elCodo()[0].p).toEqual(codo);
  });

  it('D3 (C9, 20 oct): «Quitar» deja la línea directa, con el codo otra vez sin tocar', () => {
    conGreenSuelto();
    desde(0);
    no();
    const [codo] = elCodo();
    act(() => {
      codo.setLngLat([T.lon, alNorte(250).lat]);
      codo.oyentes.dragend({ target: codo });
    });

    fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));
    desde(10);

    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(155).lat, 9);
    expect(medida()).toEqual([[en(alNorte(10)), en(G300)]]);
  });

  it('D4: andando, la línea sale de mí; el codo sin tocar te sigue en medio (C3, 20 oct)', () => {
    conGreenSuelto();
    desde(0);
    no();

    desde(50);

    expect(medida()[0][0]).toEqual(en(alNorte(50)));
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(175).lat, 9);
  });

  it('C3: con el GPS flojo, el codo sin tocar no se queda suelto (no hay línea desde ti)', () => {
    conGreenSuelto();
    desde(0);
    no();

    desde(0, 25);

    expect(elCodo()).toEqual([]);
    expect(medida()).toEqual([]);
  });

  // Agustín, 20 oct: sin tocar el codo, una sola distancia, de ti al green; al
  // moverlo, dos: de ti al codo y del codo al green
  //
  // | Caso | Situación                              | Qué pasa                                                          |
  // |------|----------------------------------------|-------------------------------------------------------------------|
  // | C1   | a ≤ 200 m del green                    | sin codo: una línea y una cifra (D1, D10)                         |
  // | C2   | a más de 200 m, sin tocar el codo      | una línea recta de ti al green, una cifra (a 3/4, hacia el green); el codo en medio, arrastrable |
  // | C3   | andando sin haberlo tocado             | el codo sigue en medio; aparece a más de 200 m y no se va hasta bajar de 190 m (que el GPS no lo haga parpadear) |
  // | C4   | se arrastra el codo                    | dos tramos con dos cifras, siguiendo al dedo                      |
  // | C5   | andando tras moverlo                   | el codo se queda; cambia la cifra hasta él, no la del codo al green |
  // | C6   | cerrar y volver a abrir                | el codo, otra vez sin tocar (C2)                                  |
  // | C7   | tocar otro punto para medir            | como antes (T3): solo esa medida; al quitarla, vuelve lo de antes |
  // | C8   | lector de pantalla                     | sin tocar, solo la distancia al green (el recuadro); movido, los dos tramos |
  // | C9   | «Quitar»                               | solo con el codo movido, y lo devuelve a sin tocar (C2)          |
  // | C10  | la cifra de ti al green, una línea     | siempre a 3/4, haya codo o no: no salta al aparecer o irse        |
  const cifrasDeMedida = () => mapas.marcas.filter((m) => !m.quitada && m.opciones.element?.dataset?.tramo === 'medida' && /mapa\.tramo/.test(m.opciones.element?.textContent ?? ''));
  const textosDeMedida = () => cifrasDeMedida().map((m) => m.opciones.element.textContent);
  const arrastrarElCodo = (m) => {
    const [codo] = elCodo();
    act(() => {
      codo.setLngLat([T.lon, alNorte(m).lat]);
      codo.oyentes.dragend({ target: codo });
    });
  };

  it('C2: a más de 200 m sin tocar el codo, una línea de ti al green con una cifra; el codo en medio y arrastrable', () => {
    conGreenSuelto();
    desde(0);

    no();

    expect(medida()).toEqual([[en(T), en(G300)]]);
    expect(textosDeMedida()).toEqual(['mapa.tramo {"metros":300}']);
    expect(elCodo()).toHaveLength(1);
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(150).lat, 9);
    expect(elCodo()[0].opciones.draggable).toBe(true);
  });

  it('C2: la cifra va a 3/4 de la línea, hacia el green, para no tapar el codo', () => {
    conGreenSuelto();
    desde(0);

    no();

    expect(cifrasDeMedida()[0].p[1]).toBeCloseTo(alNorte(225).lat, 9);
    expect(cifrasDeMedida()[0].p[0]).toBeCloseTo(T.lon, 9);
  });

  it('C3: andando sin tocarlo, el codo sigue en medio y la cifra cambia', () => {
    conGreenSuelto();
    desde(0);
    no();

    desde(50);

    expect(medida()).toEqual([[en(alNorte(50)), en(G300)]]);
    expect(textosDeMedida()).toEqual(['mapa.tramo {"metros":250}']);
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(175).lat, 9);
    expect(cifrasDeMedida()[0].p[1]).toBeCloseTo(alNorte(237.5).lat, 9);
  });

  it('C3: por debajo de 190 m sin tocarlo, el codo se va; al pasar otra vez de 200 m, vuelve', () => {
    conGreenSuelto();
    desde(0);
    no();

    desde(115);
    expect(elCodo()).toEqual([]);
    expect(medida()).toEqual([[en(alNorte(115)), en(G300)]]);
    expect(textosDeMedida()).toEqual(['mapa.tramo {"metros":185}']);

    desde(60);
    expect(elCodo()).toHaveLength(1);
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(180).lat, 9);
  });

  it.each([
    [100, 'a 200 m justos'],
    [110, 'a 190 m justos'],
  ])('C3: a la vista, el codo sigue %s m al norte (%s): el margen de 10 m', (m) => {
    conGreenSuelto();
    desde(0);
    no();

    desde(m);

    expect(elCodo()).toHaveLength(1);
  });

  it('C3: oculto, no vuelve entre 190 y 200 m; sí al pasar de 200 m', () => {
    conGreenSuelto();
    desde(0);
    no();
    desde(111);
    expect(elCodo()).toEqual([]);

    desde(105);
    expect(elCodo()).toEqual([]);
    desde(100);
    expect(elCodo()).toEqual([]);

    desde(99);
    expect(elCodo()).toHaveLength(1);
  });

  it('/code-review: al empezar a arrastrar el codo sin tocar, se queda: una lectura del GPS antes del primer «drag» no lo mueve', () => {
    conGreenSuelto();
    desde(0);
    no();
    const [codo] = elCodo();

    act(() => codo.oyentes.dragstart({ target: codo }));
    desde(10);

    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(150).lat, 9);
    expect(medida()).toHaveLength(2);
  });

  it('C3: con el GPS flojo en medio, el codo a la vista vuelve a la vista entre 190 y 200 m', () => {
    conGreenSuelto();
    desde(0);
    no();
    desde(105);
    expect(elCodo()).toHaveLength(1);

    desde(105, 25);
    desde(105);

    expect(elCodo()).toHaveLength(1);
  });

  it('C3: con el GPS flojo en medio, el codo oculto sigue oculto al volver entre 190 y 200 m', () => {
    conGreenSuelto();
    desde(0);
    no();
    desde(111);

    desde(105, 25);
    desde(105);

    expect(elCodo()).toEqual([]);
  });

  it('C4: al arrastrar el codo, dos tramos con sus dos cifras, cada una en mitad de su tramo', () => {
    conGreenSuelto();
    desde(0);
    no();

    arrastrarElCodo(250);

    expect(medida()).toEqual([[en(T), [T.lon, alNorte(250).lat]], [[T.lon, alNorte(250).lat], en(G300)]]);
    expect(textosDeMedida()).toEqual(['mapa.tramo {"metros":250}', 'mapa.tramo {"metros":50}']);
    expect(cifrasDeMedida()[0].p[1]).toBeCloseTo(alNorte(125).lat, 9);
    expect(cifrasDeMedida()[1].p[1]).toBeCloseTo(alNorte(275).lat, 9);
  });

  it('C4: las cifras siguen al dedo mientras se arrastra, antes de soltar', () => {
    conGreenSuelto();
    desde(0);
    no();

    const [codo] = elCodo();
    act(() => {
      codo.setLngLat([T.lon, alNorte(100).lat]);
      codo.oyentes.drag({ target: codo });
    });

    expect(textosDeMedida()).toEqual(['mapa.tramo {"metros":100}', 'mapa.tramo {"metros":200}']);
  });

  it('C4: un codo dejado justo en medio cuenta como movido: dos tramos', () => {
    conGreenSuelto();
    desde(0);
    no();

    arrastrarElCodo(150);

    expect(medida()).toHaveLength(2);
    expect(textosDeMedida()).toEqual(['mapa.tramo {"metros":150}', 'mapa.tramo {"metros":150}']);
  });

  it('C5: andando tras moverlo, el codo se queda; cambia la cifra hasta él, no la del codo al green', () => {
    conGreenSuelto();
    desde(0);
    no();
    arrastrarElCodo(250);

    desde(50);

    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(250).lat, 9);
    expect(medida()).toEqual([[en(alNorte(50)), [T.lon, alNorte(250).lat]], [[T.lon, alNorte(250).lat], en(G300)]]);
    expect(textosDeMedida()).toEqual(['mapa.tramo {"metros":200}', 'mapa.tramo {"metros":50}']);
  });

  it('C5: movido, sigue aunque bajes de 200 m al green', () => {
    conGreenSuelto();
    desde(0);
    no();
    arrastrarElCodo(250);

    desde(150);

    expect(elCodo()).toHaveLength(1);
    expect(medida()).toHaveLength(2);
  });

  it('C6: al cerrar y volver a abrir, el codo está otra vez sin tocar', () => {
    const { unmount } = conGreenSuelto();
    desde(0);
    no();
    arrastrarElCodo(250);
    unmount();
    mapas.length = 0;
    mapas.marcas = [];

    conGreenSuelto();
    desde(0);
    no();

    expect(medida()).toEqual([[en(T), en(G300)]]);
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(150).lat, 9);
  });

  it('C7: con el codo sin tocar, tocar otro punto mide solo hasta allí; al quitarlo, vuelve la línea al green', () => {
    conGreenSuelto();
    desde(0);
    no();

    tocar(alNorte(80));
    expect(textosDeMedida()).toEqual(['mapa.tramo {"metros":80}']);
    // M1 (24 oct): solo la línea de ti al punto, sin la del green ni su codo
    expect(medida()).toEqual([[en(T), en(alNorte(80))]]);
    expect(elCodo()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));
    expect(medida()).toEqual([[en(T), en(G300)]]);
    expect(textosDeMedida()).toEqual(['mapa.tramo {"metros":300}']);
    expect(elCodo()).toHaveLength(1);
  });

  it('M2: con el codo movido, medir lo esconde y «Quitar» lo deja donde estaba', () => {
    conGreenSuelto();
    desde(0);
    no();
    arrastrarElCodo(250);

    tocar(alNorte(80));
    expect(medida()).toEqual([[en(T), en(alNorte(80))]]);
    expect(elCodo()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));
    expect(elCodo()).toHaveLength(1);
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(250).lat, 9);
    expect(medida()).toHaveLength(2);
  });

  it('M3: tocar otro punto pasa la medida al nuevo, desde ti', () => {
    conGreenSuelto();
    desde(0);
    no();

    tocar(alNorte(80));
    tocar(alNorte(120));

    expect(medida()).toEqual([[en(T), en(alNorte(120))]]);
    expect(textosDeMedida()).toEqual(['mapa.tramo {"metros":120}']);
  });

  it('C8: sin tocar el codo no se anuncian tramos (la distancia al green la dice el recuadro)', () => {
    conGreenSuelto();
    desde(0);
    no();

    expect(screen.queryByText(/mapa\.hastaAhi/)).toBeNull();
    expect(screen.queryByText(/mapa\.deAhiAlGreen/)).toBeNull();
    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('300');
  });

  it('C8: con el codo movido se anuncian los dos tramos', () => {
    conGreenSuelto();
    desde(0);
    no();

    arrastrarElCodo(250);

    expect(screen.getByRole('status')).toHaveTextContent('mapa.hastaAhi {"metros":250}');
    expect(screen.getByRole('status')).toHaveTextContent('mapa.deAhiAlGreen {"metros":50}');
  });

  it('C9: con el codo sin tocar no hay «Quitar»', () => {
    conGreenSuelto();
    desde(0);

    no();

    expect(elCodo()).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'mapa.quitarPunto' })).toBeNull();
  });

  it('C9: con el codo movido, «Quitar» lo devuelve a sin tocar: una distancia y el codo en medio, siguiéndote', () => {
    conGreenSuelto();
    desde(0);
    no();
    arrastrarElCodo(250);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));

    expect(medida()).toEqual([[en(T), en(G300)]]);
    expect(textosDeMedida()).toEqual(['mapa.tramo {"metros":300}']);
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(150).lat, 9);
    expect(screen.queryByRole('button', { name: 'mapa.quitarPunto' })).toBeNull();
    desde(50);
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(175).lat, 9);
  });

  it('C10: sin codo (a ≤ 200 m), la cifra de ti al green también va a 3/4', () => {
    conGreenSuelto();
    desde(150);

    no();

    expect(elCodo()).toEqual([]);
    expect(cifrasDeMedida()[0].p[1]).toBeCloseTo(alNorte(262.5).lat, 9);
  });

  it('D5: con el GPS poco preciso no hay línea y se dice que se busca; sale al ser bueno', () => {
    conGreenSuelto();
    desde(0, 25);

    no();
    expect(medida()).toEqual([]);
    expect(screen.getByText('mapa.buscando')).toBeInTheDocument();

    desde(0, 5);

    expect(medida()).toHaveLength(1);
    expect(screen.queryByText('mapa.buscando')).toBeNull();
  });

  it('Revisor: si el GPS se pierde tras el «No», solo sale su aviso, no también «Buscando»', () => {
    conGreenSuelto();
    desde(150);
    no();

    act(() => gps.error({ code: 1 }));

    expect(screen.getByText('mapa.denegado')).toBeInTheDocument();
    expect(screen.queryByText('mapa.buscando')).toBeNull();
  });

  it('Revisor: «Marcar el hoyo entero» lleva el foco a lo que se pide', () => {
    conGreenSuelto();
    desde(0);
    no();

    hoyoEntero();

    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toHaveTextContent('mapa.pideSalida');
  });

  it('D2b (M1, 24 oct): un punto tocado tras el «No» y antes del GPS bueno es una medida; al quitarlo, el codo en medio', () => {
    conGreenSuelto();
    desde(0, 25);
    no();
    tocar(alNorte(100));

    desde(0);

    expect(medida()).toEqual([[en(T), en(alNorte(100))]]);
    expect(elCodo()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(150).lat, 9);
  });

  it('D5b: desde ti con codo, si el GPS se vuelve flojo se dice que se busca y no hay metros', () => {
    conGreenSuelto();
    desde(0);
    no();

    desde(0, 25);

    expect(screen.getByText('mapa.buscando')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'mapa.quitarPunto' })).toBeNull();
    expect(screen.queryByText(/mapa\.hastaAhi/)).toBeNull();
  });

  it('D6: en un hoyo sin nada, «No» pide el green; al tocarlo sale la línea desde mí y solo el green como muestra', () => {
    const { unmount, onMuestra } = abrirSinLinea();
    desde(0);

    no();
    expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'mapa.marcarEntero' })).toBeInTheDocument();
    tocar(G300);

    expect(medida()).toHaveLength(1);
    expect(medida()[0][0]).toEqual(en(T));
    unmount();
    expect(onMuestra).toHaveBeenCalledTimes(1);
    expect(onMuestra.mock.calls[0][0]).toMatchObject({ tee: null, bends: [], greenCenter: G300 });
  });

  it('D6: a ≤ 200 m del green tocado, la línea va directa', () => {
    abrirSinLinea();
    desde(150);
    no();

    tocar(G300);

    expect(medida()).toEqual([[en(alNorte(150)), en(G300)]]);
  });

  it('D7: la línea desde mí no se envía como muestra, ni moviendo el codo', () => {
    const { unmount, onMuestra } = conGreenSuelto();
    desde(0);
    no();
    tocar(alNorte(200));

    unmount();

    expect(onMuestra).not.toHaveBeenCalled();
  });

  it('D8: con el green conocido, «Marcar el hoyo entero» pide solo la salida, quita la medida y la línea va a ese green', () => {
    const { unmount, onMuestra } = conGreenSuelto({ par: 3 });
    desde(0);
    no();

    hoyoEntero();
    expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
    expect(medida()).toEqual([]);
    expect(elCodo()).toHaveLength(0);
    tocar(alNorte(10));

    expect(lineaDibujada()).toEqual([[T.lon, alNorte(10).lat], [T.lon, G300.lat]]);
    expect(medida()).toEqual([]);
    unmount();
    expect(onMuestra.mock.calls[0][0]).toMatchObject({ tee: alNorte(10), bends: [], greenCenter: G300 });
  });

  it('D8: una salida a menos de 40 m de ese green no vale: se avisa y se sigue pidiendo la salida', () => {
    const { unmount, onMuestra } = conGreenSuelto({ par: 3 });
    enLaSalida();
    no();
    hoyoEntero();

    tocar(alNorte(280));

    expect(screen.getByText('mapa.fueraDeLimites')).toBeInTheDocument();
    expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
    tocar(alNorte(10));
    unmount();
    expect(onMuestra).toHaveBeenCalledTimes(1);
    expect(onMuestra.mock.calls[0][0].tee).toEqual(alNorte(10));
  });

  it('D8: sin green, «Marcar el hoyo entero» pide la salida y el green, con el codo del par', () => {
    const { unmount, onMuestra } = abrirSinLinea();
    desde(150);
    no();

    hoyoEntero();
    expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
    tocar(alNorte(10));
    expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
    tocar(G300);

    expect(lineaDibujada()).toHaveLength(3);
    expect(lineaDibujada()[0]).toEqual([T.lon, alNorte(10).lat]);
    unmount();
    expect(onMuestra).toHaveBeenCalledTimes(1);
    expect(onMuestra.mock.calls[0][0]).toMatchObject({ tee: alNorte(10), greenCenter: G300 });
    expect(onMuestra.mock.calls[0][0].bends).toHaveLength(1);
  });

  it('D8: marcando el hoyo entero, la salida no es mi posición aunque el GPS sea bueno', () => {
    const { unmount, onMuestra } = abrirSinLinea();
    enLaSalida(5);
    no();

    hoyoEntero();
    tocar(alNorte(20));
    tocar(G300);

    unmount();
    expect(onMuestra.mock.calls[0][0].tee).toEqual(alNorte(20));
  });

  it('D8: marcando el hoyo entero, un green fuera de 40-750 m de la salida no vale', () => {
    const { unmount, onMuestra } = abrirSinLinea();
    enLaSalida();
    no();
    hoyoEntero();
    tocar(alNorte(10));

    tocar(alNorte(900));

    expect(screen.getByText('mapa.fueraDeLimites')).toBeInTheDocument();
    unmount();
    expect(onMuestra).not.toHaveBeenCalled();
  });

  it('D8: marcando el hoyo entero, «Ahora no» deja medir y «Marcar hoyo» vuelve a preguntar', () => {
    const { unmount, onMuestra } = abrirSinLinea();
    enLaSalida();
    no();
    hoyoEntero();

    fireEvent.click(screen.getByRole('button', { name: 'mapa.ahoraNo' }));
    tocar(alNorte(200));
    expect(screen.getByRole('button', { name: 'mapa.quitarPunto' })).toBeInTheDocument();
    expect(lineaDibujada()).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: /mapa\.marcarHoyo/ }));

    expect(screen.getByText('mapa.preguntaSalida')).toBeInTheDocument();
    unmount();
    expect(onMuestra).not.toHaveBeenCalled();
  });

  // Agustín, 18 oct (tras el revisor)
  //
  // | Caso | Situación                                          | Qué pasa                                                  |
  // |------|----------------------------------------------------|-----------------------------------------------------------|
  // | D8b  | «No», tocas el green y «Marcar el hoyo entero»     | solo la salida; la línea va a ese green, con el codo del par |
  // | D8c  | y se cierra el mapa                                | una sola muestra, completa; no la de solo green           |
  // | D8d  | con la salida a < 40 m de ese green                | se avisa y se sigue pidiendo la salida                    |
  // | D8e  | y «Ahora no»                                       | sale la de solo green que ya había                        |
  // | D3b  | arrastrando el codo                                | la línea y los metros siguen al dedo                      |
  // | D3c  | arrastrar y soltar                                 | nada se envía                                             |
  const conGreenTocado = (props) => {
    const r = abrirSinLinea(props);
    desde(150);
    no();
    tocar(G300);
    hoyoEntero();
    return r;
  };

  it('D8b/D8c: con el green recién tocado, «Marcar el hoyo entero» pide solo la salida y sale una muestra completa', () => {
    const { unmount, onMuestra } = conGreenTocado();

    expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
    tocar(alNorte(10));

    expect(screen.queryByText('mapa.pideGreen')).toBeNull();
    expect(lineaDibujada()[0]).toEqual([T.lon, alNorte(10).lat]);
    expect(lineaDibujada().at(-1)).toEqual(en(G300));
    expect(lineaDibujada()).toHaveLength(3);
    unmount();
    expect(onMuestra).toHaveBeenCalledTimes(1);
    expect(onMuestra.mock.calls[0][0]).toMatchObject({ tee: alNorte(10), greenCenter: G300 });
    expect(onMuestra.mock.calls[0][0].bends).toHaveLength(1);
  });

  it('D8b: en un par 3, sin codos', () => {
    const { unmount, onMuestra } = conGreenTocado({ par: 3 });
    tocar(alNorte(10));

    unmount();
    expect(onMuestra.mock.calls[0][0]).toMatchObject({ tee: alNorte(10), bends: [], greenCenter: G300 });
  });

  it('D8d: una salida a menos de 40 m de ese green no vale: se avisa y se sigue pidiendo', () => {
    conGreenTocado();

    tocar(alNorte(280));

    expect(screen.getByText('mapa.fueraDeLimites')).toBeInTheDocument();
    expect(screen.getByText('mapa.pideSalida')).toBeInTheDocument();
  });

  it('D8e: «Ahora no» deja la muestra de solo green', () => {
    const { unmount, onMuestra } = conGreenTocado();

    fireEvent.click(screen.getByRole('button', { name: 'mapa.ahoraNo' }));

    unmount();
    expect(onMuestra).toHaveBeenCalledTimes(1);
    expect(onMuestra.mock.calls[0][0]).toMatchObject({ tee: null, bends: [], greenCenter: G300 });
  });

  it('D3b/D3c: arrastrando el codo, la línea y los metros siguen al dedo; nada se envía', () => {
    const { unmount, onMuestra } = conGreenSuelto();
    desde(0);
    no();

    const [codo] = elCodo();
    act(() => {
      codo.setLngLat([T.lon, alNorte(250).lat]);
      codo.oyentes.drag({ target: codo });
    });

    expect(medida()[0][1]).toEqual([T.lon, alNorte(250).lat]);
    expect(medida()[1][0]).toEqual([T.lon, alNorte(250).lat]);
    expect(mapas.marcas.filter((m) => !m.quitada && m.opciones.element?.dataset?.tramo === 'medida').map((m) => m.opciones.element.textContent)).toEqual(['mapa.tramo {"metros":250}', 'mapa.tramo {"metros":50}']);
    act(() => codo.oyentes.dragend({ target: codo }));
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(250).lat, 9);
    unmount();
    expect(onMuestra).not.toHaveBeenCalled();
  });

  it('D8: tras «Marcar hoyo», volver a decir «No» vuelve a poner el codo', () => {
    conGreenSuelto();
    desde(0);
    no();
    hoyoEntero();
    fireEvent.click(screen.getByRole('button', { name: 'mapa.ahoraNo' }));
    fireEvent.click(screen.getByRole('button', { name: /mapa\.marcarHoyo/ }));

    no();

    expect(elCodo()).toHaveLength(1);
    expect(medida()).toHaveLength(1);
  });

  it('D: midiendo como siempre (hoyo con línea), el punto tocado no se arrastra', () => {
    abrir({ hoyo: { playLine: [T, G300], green: { front: alNorte(290), center: G300, back: alNorte(310) } }, porMarcar: null });
    act(() => mapa().oyentes.load());
    desde(0);

    tocar(alNorte(200));

    const elPunto = mapas.marcas.filter((m) => !m.quitada && m.opciones.element?.dataset?.punto === 'medido');
    expect(elPunto).toHaveLength(1);
    expect(elPunto[0].opciones.draggable).toBeFalsy();
    expect(elCodo()).toEqual([]);
    expect(screen.queryByRole('button', { name: 'mapa.marcarEntero' })).toBeNull();
  });

  // Agustín, 18 oct: en un hoyo con línea, abierto a mitad de hoyo, solo la
  // distancia de ti al green (sin pregunta)
  //
  // | Caso | Situación                                     | Qué pasa                                                        |
  // |------|-----------------------------------------------|-----------------------------------------------------------------|
  // | H1   | primer GPS bueno a > 40 m de la salida        | la línea del hoyo se oculta; la amarilla de ti al green (codo si > 200 m) |
  // | H2   | a ≤ 40 m                                      | el hoyo entero, como ahora                                      |
  // | H3   | «Ver hoyo»                                    | encuadra y vuelve a pintar la línea entera; la amarilla sigue   |
  // | H4   | andando                                       | se decidió con el primer GPS bueno: no cambia                   |
  // | H5   | GPS flojo, lejos o sin ubicación              | el hoyo entero; se decide al llegar un GPS bueno                |
  // | H6   | el codo                                       | como D3, D4 y D10                                               |
  // | H8   | hoyo con salida y sin green                   | como ahora: se pide el green                                    |
  // | H9   | «⋮» y cancelar                                | vuelve la línea desde ti, con su codo                           |
  // | H10  | la línea desde ti                             | no se envía                                                     |
  // | H11  | a mitad de hoyo                               | sin enlace «Marcar el hoyo entero»                              |
  describe('H: a mitad de un hoyo con línea', () => {
    const CON_LINEA = { playLine: [T, G300], green: { front: alNorte(290), center: G300, back: alNorte(310) } };
    const abrirConLinea = (props = {}) => {
      const r = abrir({ hoyo: CON_LINEA, par: 3, porMarcar: null, recoge: true, onMuestra: vi.fn(), ...props });
      act(() => mapa().oyentes.load());
      return r;
    };
    const conLaLinea = () => expect(lineaDibujada()).toEqual([en(T), en(G300)]);
    // El codo se mueve arrastrándolo; tocar mide (19 oct: T3)
    const arrastrarCodo = (p) => {
      const [codo] = elCodo();
      act(() => {
        codo.setLngLat([p.lon, p.lat]);
        codo.oyentes.dragend({ target: codo });
      });
    };

    it('H1: a más de 40 m de la salida, la línea del hoyo se oculta y sale la de ti al green', () => {
      abrirConLinea();
      desde(150);

      expect(lineaDibujada()).toBeUndefined();
      expect(mapas.marcas.filter((m) => !m.quitada && m.opciones.draggable && !elCodo().includes(m))).toEqual([]);
      expect(medida()).toEqual([[en(alNorte(150)), en(G300)]]);
      expect(screen.queryByText('mapa.preguntaSalida')).toBeNull();
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('150');
    });

    it('H1: oculta también sus cifras', () => {
      abrirConLinea();
      desde(150);

      const deLaLineaVivas = mapas.marcas.filter((m) => !m.quitada && m.opciones.element?.dataset?.tramo === 'linea');
      expect(deLaLineaVivas).toEqual([]);
      expect(screen.queryByTestId('tramos-de-la-linea')).toBeNull();
    });

    it('H1: los 40 m se cuentan desde la salida de mi barra, no desde la de la línea', () => {
      // La línea mide 300 m y mi tarjeta 250: mi salida, 50 m más adelante
      abrirConLinea({ metros: 250 });
      desde(80);

      expect(lineaDibujada()).toBeDefined();
      expect(medida()).toEqual([]);
    });

    it('H1/H6: a más de 200 m del green, con el codo en medio', () => {
      abrirConLinea();
      desde(50);

      expect(elCodo()).toHaveLength(1);
      expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(175).lat, 9);
      expect(medida()).toHaveLength(1);
    });

    it('H2: a 40 m o menos de la salida, el hoyo entero', () => {
      abrirConLinea();
      desde(40);

      conLaLinea();
      expect(medida()).toEqual([]);
    });

    it('H3: «Ver hoyo» vuelve a pintar la línea entera y la amarilla sigue', () => {
      abrirConLinea();
      desde(150);

      fireEvent.click(screen.getByRole('button', { name: /mapa\.verHoyo/ }));

      conLaLinea();
      expect(medida()).toEqual([[en(alNorte(150)), en(G300)]]);
    });

    it('H4: decidido el hoyo entero, andando más allá de 40 m no cambia', () => {
      abrirConLinea();
      desde(10);

      desde(150);

      conLaLinea();
      expect(medida()).toEqual([]);
    });

    it('H4: decidida la línea desde ti, andando sin llegar a la salida no cambia', () => {
      abrirConLinea();
      desde(150);

      desde(41);

      expect(lineaDibujada()).toBeUndefined();
      expect(medida()).toEqual([[en(alNorte(41)), en(G300)]]);
    });

    // | H12  | desde ti y llegas a ≤ 40 m de tu salida        | el hoyo entero, una vez; la amarilla y su codo se van     |
    // | H13  | la línea movida antes del primer GPS bueno      | se queda el hoyo entero, con lo editado                   |
    // | H9b  | el menú de motivos abierto                      | la línea desde ti no cambia; el codo no se arrastra       |
    // | D3d  | tocar otro sitio desde ti                       | el codo va allí y el mapa no gira ni se encuadra          |
    it('H12: llegando a la salida vuelve el hoyo entero, y ya no cambia', () => {
      abrirConLinea();
      desde(50);
      expect(elCodo()).toHaveLength(1);

      desde(40);
      conLaLinea();
      expect(medida()).toEqual([]);
      expect(elCodo()).toEqual([]);

      desde(150);
      conLaLinea();
      expect(medida()).toEqual([]);
    });

    it('H12: también tras «Ver hoyo»', () => {
      abrirConLinea();
      desde(150);
      fireEvent.click(screen.getByRole('button', { name: /mapa\.verHoyo/ }));

      desde(10);

      conLaLinea();
      expect(medida()).toEqual([]);
    });

    it('H12: a mitad de un reporte no se cambia nada', () => {
      abrirConLinea({ onReporte: vi.fn() });
      desde(50);
      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.motivos.WRONG_LINE' }));

      desde(10);
      fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

      // Al cancelar, se ve y luego se decide: el hoyo entero
      conLaLinea();
      expect(elCodo()).toEqual([]);
    });

    it('H13: con la línea ya movida, el primer GPS bueno lejos de la salida no la oculta', () => {
      abrirConLinea();
      desde(150, 25);
      const [salida] = mapas.marcas.filter((m) => !m.quitada && m.opciones.draggable);
      act(() => {
        salida.setLngLat([T.lon, alNorte(5).lat]);
        salida.oyentes.dragend({ target: salida });
      });

      desde(150);

      expect(lineaDibujada()).toBeDefined();
      expect(medida()).toEqual([]);
    });

    it('H9b: con el menú de motivos abierto y el GPS flojo, la línea desde ti no aparece y el codo no se arrastra', () => {
      abrirConLinea({ onReporte: vi.fn() });
      desde(50);
      // Movido, que sin tocar se va con el GPS flojo (C3, 20 oct)
      const [movido] = elCodo();
      act(() => {
        movido.setLngLat([T.lon, alNorte(200).lat]);
        movido.oyentes.dragend({ target: movido });
      });
      desde(50, 25);
      expect(medida()).toEqual([]);

      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));

      expect(medida()).toEqual([]);
      expect(elCodo()[0].opciones.draggable).toBeFalsy();
      fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));
      expect(elCodo()[0].opciones.draggable).toBe(true);
    });

    it('D3d (M1, 24 oct; T6): tocando otro sitio desde ti, se mide solo hasta allí; el codo vuelve igual y el mapa no gira', () => {
      abrirConLinea();
      desde(50);
      const codo = elCodo()[0].p;
      mapa().fitBounds.mockClear();

      act(() => mapa().oyentes.click({ lngLat: { lat: alNorte(100).lat, lng: T.lon + 0.0005 } }));

      expect(medida()).toEqual([[en(alNorte(50)), [T.lon + 0.0005, alNorte(100).lat]]]);
      expect(mapa().fitBounds).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));
      expect(elCodo()[0].p).toEqual(codo);
    });

    it('H5: con el GPS flojo, el hoyo entero; al ser bueno, se decide', () => {
      abrirConLinea();
      desde(150, 25);
      conLaLinea();

      desde(150, 5);

      expect(lineaDibujada()).toBeUndefined();
      expect(medida()).toHaveLength(1);
    });

    it.each([
      ['lejos del campo', () => act(() => gps.exito(lectura(40.4, -3.7)))],
      ['sin permiso de ubicación', () => act(() => gps.error({ code: 1 }))],
    ])('H5: %s, el hoyo entero', (_caso, gpsAhora) => {
      abrirConLinea();
      gpsAhora();

      conLaLinea();
      expect(medida()).toEqual([]);
    });

    it('H8: un hoyo con salida y sin green sigue pidiendo el green', () => {
      abrirConLinea({ hoyo: { playLine: [T, alNorte(150)], green: null }, porMarcar: 'green' });
      desde(100);

      expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
      expect(medida()).toEqual([]);
    });

    it('H9: al cancelar el «⋮», vuelve la línea desde ti con su codo', () => {
      abrirConLinea({ onReporte: vi.fn() });
      desde(50);

      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

      expect(lineaDibujada()).toBeUndefined();
      expect(elCodo()).toHaveLength(1);
      expect(medida()).toHaveLength(1);
    });

    it('H9: reportando, se ve la línea que se propone y no la de ti al green', () => {
      abrirConLinea({ onReporte: vi.fn() });
      desde(50);

      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.motivos.WRONG_LINE' }));
      expect(medida()).toEqual([]);
      tocar(alNorte(5));
      tocar(alNorte(290));

      expect(lineaDibujada()).toBeDefined();
      expect(medida()).toEqual([]);
    });

    it('C2/H9: eligiendo un motivo, el codo sin tocar no se queda debajo de lo que se propone', () => {
      abrirConLinea({ onReporte: vi.fn() });
      desde(50);
      expect(elCodo()).toHaveLength(1);

      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.motivos.WRONG_LINE' }));

      expect(elCodo()).toEqual([]);
    });

    it('C5/H9: con el codo movido, tras elegir un motivo y cancelar, vuelve donde se dejó, con sus dos tramos', () => {
      abrirConLinea({ onReporte: vi.fn() });
      desde(50);
      const [codo] = elCodo();
      act(() => {
        codo.setLngLat([T.lon, alNorte(200).lat]);
        codo.oyentes.dragend({ target: codo });
      });

      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.motivos.WRONG_LINE' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

      expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(200).lat, 9);
      expect(medida()).toHaveLength(2);
    });

    it('H9: tras elegir un motivo y cancelar, vuelve el codo', () => {
      abrirConLinea({ onReporte: vi.fn() });
      desde(50);

      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.motivos.WRONG_LINE' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

      expect(lineaDibujada()).toBeUndefined();
      expect(elCodo()).toHaveLength(1);
      expect(medida()).toHaveLength(1);
    });

    it('Revisor: con el «⋮» abierto no se decide: al cancelar, la línea desde ti y su codo', () => {
      abrirConLinea({ onReporte: vi.fn() });
      desde(50, 25);

      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.motivos.WRONG_LINE' }));
      desde(50);
      expect(medida()).toEqual([]);
      expect(elCodo()).toEqual([]);
      fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

      expect(lineaDibujada()).toBeUndefined();
      expect(elCodo()).toHaveLength(1);
      expect(medida()).toHaveLength(1);
    });

    it('Revisor: un punto tocado antes de decidir no se queda como codo', () => {
      abrirConLinea();
      desde(150, 25);
      tocar(alNorte(200));

      desde(150);

      // Se queda como medida, no como codo, y sola (M1, 24 oct)
      expect(medida()).toEqual([[en(alNorte(150)), en(alNorte(200))]]);
      expect(elCodo()).toEqual([]);
    });

    it('Revisor: cancelar desde los motivos deja el codo donde se arrastró', () => {
      abrirConLinea({ onReporte: vi.fn() });
      desde(50);
      arrastrarCodo(alNorte(100));

      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

      expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(100).lat, 9);
    });

    it('Revisor (C9, 20 oct): cancelar desde los motivos tras «Quitar» trae el codo sin tocar, no el movido', () => {
      abrirConLinea({ onReporte: vi.fn() });
      desde(50);
      arrastrarCodo(alNorte(100));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));

      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

      expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(175).lat, 9);
      expect(medida()).toEqual([[en(alNorte(50)), en(G300)]]);
    });

    it('Revisor: tras elegir motivo y cancelar, el codo vuelve donde estaba', () => {
      abrirConLinea({ onReporte: vi.fn() });
      desde(50);
      arrastrarCodo(alNorte(100));

      fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.motivos.WRONG_LINE' }));
      fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

      expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(100).lat, 9);
    });

    // | H14  | oculta y el GPS se vuelve flojo o se pierde      | la línea del hoyo entera mientras dure; al volver, la amarilla |
    it('H14/H14c: con el GPS flojo vuelve la línea del hoyo; al ser bueno, otra vez la amarilla con su codo', () => {
      abrirConLinea();
      desde(50);
      arrastrarCodo(alNorte(100));

      desde(50, 25);
      conLaLinea();
      expect(screen.queryByTestId('tramos-de-la-linea')).not.toBeNull();
      expect(screen.getByText('mapa.buscando')).toBeInTheDocument();

      desde(50);
      expect(lineaDibujada()).toBeUndefined();
      expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(100).lat, 9);
      expect(medida()).toHaveLength(2);
    });

    it('H14/C3: con el codo sin tocar y el GPS flojo, la línea del hoyo y ningún codo suelto; al ser bueno, el codo en medio', () => {
      abrirConLinea();
      desde(50);

      desde(50, 25);
      conLaLinea();
      expect(elCodo()).toEqual([]);

      desde(50);
      expect(lineaDibujada()).toBeUndefined();
      expect(elCodo()).toHaveLength(1);
      expect(medida()).toHaveLength(1);
    });

    it('/code-review: con el codo sin tocar a la vista y el GPS que se vuelve flojo, que crezca el panel no reencuadra', () => {
      const observados = [];
      vi.stubGlobal('ResizeObserver', class {
        constructor(fn) { this.fn = fn; observados.push(this); }
        observe() {}
        disconnect() {}
      });
      abrirConLinea();
      desde(50);
      desde(50, 25);
      mapa().jumpTo.mockClear();

      act(() => observados.at(-1).fn());

      expect(mapa().jumpTo).not.toHaveBeenCalled();
    });

    it('H14b: sin ubicación, la línea del hoyo entera', () => {
      abrirConLinea();
      desde(150);

      act(() => gps.error({ code: 1 }));

      conLaLinea();
      expect(screen.getByText('mapa.denegado')).toBeInTheDocument();
    });

    it('H10: nada de la línea desde ti se envía', () => {
      const onMuestra = vi.fn();
      const { unmount } = abrirConLinea({ onMuestra });
      desde(50);
      tocar(alNorte(200));

      unmount();

      expect(onMuestra).not.toHaveBeenCalled();
    });

    it('H11: a mitad de hoyo no hay enlace «Marcar el hoyo entero»', () => {
      abrirConLinea();
      desde(150);

      expect(screen.queryByRole('button', { name: 'mapa.marcarEntero' })).toBeNull();
    });
  });

  // V2 (17 oct): una referencia por hoyo, vista desde mi barra
  it('V2: la salida de la línea se lleva a mis metros, sobre el primer tramo', () => {
    abrir({ hoyo: { playLine: [T, alNorte(300)], green: { front: alNorte(290), center: alNorte(300), back: alNorte(310) } }, metros: 270, par: 3 });
    act(() => mapa().oyentes.load());

    expect(lineaDibujada()[0][1]).toBeCloseTo(alNorte(30).lat, 9);
    expect(screen.getByTestId('tramos-de-la-linea')).toHaveTextContent('{"a":270}');
  });

  it('V2: sin metros en la tarjeta, la salida de la línea tal cual', () => {
    abrir({ hoyo: { playLine: [T, alNorte(300)], green: { front: alNorte(290), center: alNorte(300), back: alNorte(310) } }, metros: null, par: 3 });
    act(() => mapa().oyentes.load());

    expect(lineaDibujada()[0]).toEqual([T.lon, T.lat]);
  });

  it('V2: el hoyo se encuadra con mi salida (la atrasada, también)', () => {
    const hoyo = { playLine: [T, alNorte(300)], green: { front: alNorte(290), center: alNorte(300), back: alNorte(310) } };
    abrir({ hoyo, metros: 340, par: 3 });

    const conMiSalida = { ...hoyo, playLine: [alNorte(-40), alNorte(300)] };
    const bearing = orientacionDelHoyo(conMiSalida);
    const { center, zoom } = encuadreGirado(conMiSalida, bearing, { ancho: 360, alto: 640, padding: { top: 90, bottom: 288, left: 40, right: 40 } });
    const [ultima] = mapa().jumpTo.mock.calls.at(-1);
    expect(ultima.center[1]).toBeCloseTo(center.lat, 6);
    expect(ultima.zoom).toBeCloseTo(zoom, 6);
  });

  it('V2: mi propia línea (colocarSalida apagado) no se mueve', () => {
    abrir({ hoyo: { playLine: [T, alNorte(300)], green: { front: alNorte(290), center: alNorte(300), back: alNorte(310) } }, metros: 270, par: 3, colocarSalida: false });
    act(() => mapa().oyentes.load());

    expect(lineaDibujada()[0]).toEqual([T.lon, T.lat]);
  });

  it('V2: abrirla con mis metros no envía nada (no la he movido)', () => {
    const onMuestra = vi.fn();
    const { unmount } = abrir({ hoyo: { playLine: [T, alNorte(300)], green: { front: alNorte(290), center: alNorte(300), back: alNorte(310) } }, metros: 270, par: 3, recoge: true, onMuestra });
    act(() => mapa().oyentes.load());

    unmount();

    expect(onMuestra).not.toHaveBeenCalled();
  });

  describe('el recuadro', () => {
    const HOYO_T = { playLine: [T, alNorte(300)], green: { front: alNorte(290), center: alNorte(300), back: alNorte(312) } };

    it('B1: con buen GPS y en el hoyo, desde mi posición, y sigue al moverme', () => {
      abrir({ hoyo: HOYO_T, metros: 342 });

      act(() => gps.exito(lectura(alNorte(100).lat, T.lon, 10)));
      expect(screen.getByTestId('distancia-delante')).toHaveTextContent('190');
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('200');
      expect(screen.getByTestId('distancia-fondo')).toHaveTextContent('212');
      expect(screen.getByText('mapa.desdeTuPosicion')).toBeInTheDocument();

      act(() => gps.exito(lectura(alNorte(150).lat, T.lon, 10)));
      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('150');
    });

    it('B1: el lector de pantalla oye de dónde salen las cifras: desde tu posición', () => {
      abrir({ hoyo: HOYO_T, metros: 342 });

      act(() => gps.exito(lectura(alNorte(100).lat, T.lon, 10)));

      expect(screen.getByText('mapa.etiqueta {"front":190,"center":200,"back":212,"origen":"mapa.desdeTuPosicion"}')).toHaveClass('sr-only');
      expect(screen.getByText('mapa.desdeTuPosicion')).toHaveAttribute('aria-hidden', 'true');
    });

    it.each([
      ['GPS con 25 m de error', () => act(() => gps.exito(lectura(alNorte(100).lat, T.lon, 25)))],
      ['sin GPS', () => act(() => gps.error({ code: 1 }))],
      ['a más de 750 m del green', () => act(() => gps.exito(lectura(alNorte(-500).lat, T.lon, 5)))],
    ])('B2: %s, la tarjeta de mi barra', (_caso, gpsAhora) => {
      abrir({ hoyo: HOYO_T, metros: 342 });

      gpsAhora();

      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('342');
      expect(screen.getByText('mapa.desdeTuBarra')).toBeInTheDocument();
    });

    it('B2: sin metros en la tarjeta, medido sobre la línea: «desde la salida»', () => {
      abrir({ hoyo: HOYO_T, metros: null });

      expect(screen.getByTestId('distancia-centro')).toHaveTextContent('300');
      expect(screen.getByText('mapa.desdeLaSalida')).toBeInTheDocument();
    });

    it('B4: sin green, no hay recuadro aunque la tarjeta traiga metros', () => {
      abrirSinLinea();

      expect(screen.queryByTestId('distancia-centro')).toBeNull();
    });
  });
});


// Agustín, 18 oct (entrega 7): reportar un hoyo con línea. El motivo y la línea
// que propone el jugador; los jugadores siguen viendo la de siempre
//
// | Caso | Situación                                         | Qué pasa                                                    |
// |------|---------------------------------------------------|-------------------------------------------------------------|
// | P1   | hoyo con línea y con quien reciba el reporte      | «⋮» (Reportar un problema) junto a «Cerrar»                 |
// | P2   | hoyo sin línea, o sin quien lo reciba             | sin «⋮»                                                     |
// | P3   | «⋮»                                               | «¿Qué le pasa a este hoyo?», los tres motivos y «Cancelar»; el mapa no mide |
// | P4   | un motivo                                         | la línea de siempre se oculta; salida buena, green bueno, codos del par |
// | P5   | green a menos de 40 o más de 750 m de la salida   | se avisa y se sigue pidiendo el green                       |
// | P6   | «Enviar reporte»                                  | sale una vez (id, motivo, línea); gracias; vuelve la de siempre |
// | P7   | «Cancelar» a mitad                                | nada sale; vuelve la de siempre                              |
// | P8   | cerrar el mapa a mitad                            | ni reporte ni muestra con la línea propuesta                |
// | P9   | había movido la línea y luego reporta y cierra    | sale la muestra de lo que movió, no la propuesta            |
// | P10  | arrastra un codo de la propuesta                  | sale con el codo movido                                     |
// | P11  | se pregunta o se marca el hoyo                    | sin «⋮» mientras tanto                                      |
describe('MapaDelHoyo — reportar un hoyo (entrega 7)', () => {
  const M_POR_GRADO = (6371008.8 * Math.PI) / 180;
  const T = { lat: 36.28, lon: -5.33 };
  const alNorte = (m, de = T) => ({ lat: de.lat + m / M_POR_GRADO, lon: de.lon });
  const tocar = (p) => act(() => mapa().oyentes.click({ lngLat: { lat: p.lat, lng: p.lon } }));
  const lineaDibujada = () => mapa().fuentes.marcado?.data.features.find((f) => f.properties.tipo === 'linea')?.geometry.coordinates;
  const LINEA = { playLine: [T, alNorte(300)], green: { front: alNorte(290), center: alNorte(300), back: alNorte(310) } };
  const menu = () => fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
  const motivo = (clave) => fireEvent.click(screen.getByRole('button', { name: `mapa.motivos.${clave}` }));
  const abrirConLinea = (props = {}) => {
    const onReporte = props.onReporte ?? vi.fn();
    const onMuestra = props.onMuestra ?? vi.fn();
    const r = abrir({ hoyo: LINEA, par: 4, metros: null, recoge: true, onReporte, onMuestra, ...props });
    act(() => mapa().oyentes.load());
    return { ...r, onReporte, onMuestra };
  };
  // Del menú a la propuesta lista: salida a 20 m de la de siempre, green a 280 m
  const proponer = (clave = 'WRONG_LINE') => {
    menu();
    motivo(clave);
    tocar(alNorte(20));
    tocar(alNorte(280));
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

  it('P1: en un hoyo con línea, «⋮» junto a «Cerrar»', () => {
    abrirConLinea();

    const boton = screen.getByRole('button', { name: 'mapa.reportar' });
    expect(boton.parentElement).toBe(screen.getByRole('button', { name: /mapa\.cerrar/ }).parentElement);
  });

  it.each([
    ['sin línea', { hoyo: null, porMarcar: 'salida' }],
    ['solo con el green, sin nada que marcar', { hoyo: { playLine: [], green: { front: alNorte(290), center: alNorte(300), back: alNorte(310) } }, porMarcar: null }],
    ['sin quien reciba el reporte', { onReporte: null }],
  ])('P2: %s, sin «⋮»', (_caso, props) => {
    abrirConLinea(props);

    expect(screen.queryByRole('button', { name: 'mapa.reportar' })).toBeNull();
  });

  it('P3: «⋮» abre los motivos; «Cancelar» lo cierra y mientras tanto el mapa no mide', () => {
    abrirConLinea();
    const deSiempre = lineaDibujada();

    menu();
    expect(screen.getByText('mapa.reporteTitulo')).toBeInTheDocument();
    for (const clave of ['WRONG_HOLE', 'WRONG_LINE', 'HOLE_CHANGED']) {
      expect(screen.getByRole('button', { name: `mapa.motivos.${clave}` })).toBeInTheDocument();
    }
    tocar(alNorte(150));
    expect(screen.queryByRole('button', { name: 'mapa.quitarPunto' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

    expect(screen.queryByText('mapa.reporteTitulo')).toBeNull();
    expect(lineaDibujada()).toEqual(deSiempre);
  });

  it('P4: con un motivo, la de siempre se oculta y se marca la propuesta con los codos del par', () => {
    abrirConLinea();
    menu();
    motivo('WRONG_LINE');

    // Ni la línea que se mueve, ni la del hoyo debajo, ni sus cifras
    expect(lineaDibujada()).toBeUndefined();
    expect(mapa().fuentes.hoyo.data.features).toEqual([]);
    expect(screen.queryByTestId('tramos-de-la-linea')).toBeNull();
    expect(screen.getByText('mapa.reporteSalida')).toBeInTheDocument();
    tocar(alNorte(20));
    expect(screen.getByText('mapa.reporteGreen')).toBeInTheDocument();
    tocar(alNorte(280));

    expect(lineaDibujada()).toHaveLength(3);
    expect(lineaDibujada()[0]).toEqual([T.lon, alNorte(20).lat]);
    expect(screen.getByRole('button', { name: 'mapa.enviarReporte' })).toBeInTheDocument();
  });

  it('P5: un green a más de 750 m de la salida no vale: se avisa y se sigue pidiendo', () => {
    abrirConLinea();
    menu();
    motivo('WRONG_HOLE');
    tocar(alNorte(20));

    tocar(alNorte(900));

    expect(screen.getByText('mapa.fueraDeLimites')).toBeInTheDocument();
    expect(screen.getByText('mapa.reporteGreen')).toBeInTheDocument();
    expect(lineaDibujada()).toBeUndefined();
  });

  it('P6: «Enviar reporte» lo manda una vez, da las gracias y vuelve la de siempre', () => {
    const { onReporte, unmount, onMuestra } = abrirConLinea();
    const deSiempre = lineaDibujada();
    proponer('HOLE_CHANGED');

    fireEvent.click(screen.getByRole('button', { name: 'mapa.enviarReporte' }));

    expect(onReporte).toHaveBeenCalledTimes(1);
    const enviado = onReporte.mock.calls[0][0];
    expect(enviado).toMatchObject({ reason: 'HOLE_CHANGED', tee: alNorte(20), greenCenter: alNorte(280) });
    expect(enviado.bends).toHaveLength(1);
    expect(typeof enviado.id).toBe('string');
    expect(screen.getByText('mapa.reporteGracias')).toBeInTheDocument();
    expect(lineaDibujada()).toEqual(deSiempre);
    unmount();
    expect(onMuestra).not.toHaveBeenCalled();
  });

  it('P7: «Cancelar» a mitad no manda nada y vuelve la de siempre', () => {
    const { onReporte } = abrirConLinea();
    const deSiempre = lineaDibujada();
    menu();
    motivo('WRONG_LINE');
    tocar(alNorte(20));

    fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

    expect(onReporte).not.toHaveBeenCalled();
    expect(lineaDibujada()).toEqual(deSiempre);
    expect(screen.getByRole('button', { name: 'mapa.reportar' })).toBeInTheDocument();
  });

  it('P8: cerrar el mapa a mitad no manda el reporte ni la propuesta como muestra', () => {
    const { onReporte, onMuestra, unmount } = abrirConLinea();
    proponer();

    unmount();

    expect(onReporte).not.toHaveBeenCalled();
    expect(onMuestra).not.toHaveBeenCalled();
  });

  it('P9: si antes movió la línea, al cerrar a mitad del reporte sale lo que movió', () => {
    const { onMuestra, unmount } = abrirConLinea();
    const salida = mapas.marcas.filter((m) => !m.quitada && m.opciones.draggable)[0];
    act(() => {
      salida.setLngLat([T.lon, alNorte(10).lat]);
      salida.oyentes.dragend({ target: salida });
    });
    proponer();

    unmount();

    expect(onMuestra).toHaveBeenCalledTimes(1);
    expect(onMuestra.mock.calls[0][0].tee).toEqual({ lat: alNorte(10).lat, lon: T.lon });
  });

  it('P10: arrastrar un codo de la propuesta lo mueve en el reporte', () => {
    const { onReporte } = abrirConLinea();
    proponer();
    const codo = mapas.marcas.filter((m) => !m.quitada && m.opciones.draggable)[1];
    act(() => {
      codo.setLngLat([-5.331, alNorte(150).lat]);
      codo.oyentes.dragend({ target: codo });
    });

    fireEvent.click(screen.getByRole('button', { name: 'mapa.enviarReporte' }));

    expect(onReporte.mock.calls[0][0].bends).toEqual([{ lat: alNorte(150).lat, lon: -5.331 }]);
  });

  // Revisor, 18 oct
  const moverLaSalida = () => {
    const salida = mapas.marcas.filter((m) => !m.quitada && m.opciones.draggable)[0];
    act(() => {
      salida.setLngLat([T.lon, alNorte(10).lat]);
      salida.oyentes.dragend({ target: salida });
    });
  };
  const ocultar = () =>
    act(() => {
      Object.defineProperty(globalThis.document, 'visibilityState', { value: 'hidden', configurable: true });
      globalThis.document.dispatchEvent(new globalThis.Event('visibilitychange'));
    });

  it('R-1: con el menú abierto, cerrar el mapa manda lo que se movió, sin romper nada', () => {
    const { onMuestra, unmount } = abrirConLinea();
    moverLaSalida();
    menu();

    expect(() => unmount()).not.toThrow();
    expect(onMuestra).toHaveBeenCalledTimes(1);
    expect(onMuestra.mock.calls[0][0].tee).toEqual({ lat: alNorte(10).lat, lon: T.lon });
  });

  it('R-1: con el menú abierto, ocultar la app manda lo que se movió', () => {
    const { onMuestra } = abrirConLinea();
    moverLaSalida();
    menu();

    ocultar();

    expect(onMuestra).toHaveBeenCalledTimes(1);
  });

  it('R-2: sin mapa (sin WebGL), sin «⋮»', () => {
    mapas.sinWebgl = true;
    abrir({ hoyo: LINEA, par: 4, onReporte: vi.fn() });

    expect(screen.queryByRole('button', { name: 'mapa.reportar' })).toBeNull();
  });

  it('R-3: marcando la propuesta, el doble toque no acerca; al acabar, sí', () => {
    abrirConLinea();
    menu();
    motivo('WRONG_LINE');
    expect(mapa().doubleClickZoom.disable).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

    expect(mapa().doubleClickZoom.enable).toHaveBeenCalled();
  });

  it('R-4: en un par 3 (sin codos), la propuesta no habla de codos', () => {
    abrirConLinea({ par: 3 });
    proponer();

    expect(screen.queryByText('mapa.ayudaCodo')).toBeNull();
    expect(screen.getByText('mapa.reporteSinCodos')).toBeInTheDocument();
  });

  it('R-5: con la propuesta lista, el texto arriba y los botones debajo', () => {
    abrirConLinea();
    proponer();

    const enviar = screen.getByRole('button', { name: 'mapa.enviarReporte' });
    expect(enviar.closest('[data-testid="barra-del-reporte"]')).toHaveClass('flex-col');
  });

  it('R-6: el foco va al primer motivo, y al acabar vuelve a «⋮»', () => {
    abrirConLinea();

    menu();
    expect(screen.getByRole('button', { name: 'mapa.motivos.WRONG_HOLE' })).toHaveFocus();
    expect(screen.getByRole('group', { name: 'mapa.reporteTitulo' })).toBeInTheDocument();
    motivo('WRONG_HOLE');
    fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

    expect(screen.getByRole('button', { name: 'mapa.reportar' })).toHaveFocus();
  });

  it('R-7: las gracias se anuncian y se van al tocar el mapa', () => {
    abrirConLinea();
    proponer();
    fireEvent.click(screen.getByRole('button', { name: 'mapa.enviarReporte' }));

    const gracias = screen.getByText('mapa.reporteGracias');
    expect(gracias.closest('[aria-live="polite"]')).not.toBeNull();
    tocar(alNorte(100));

    expect(screen.queryByText('mapa.reporteGracias')).toBeNull();
  });

  it('R-8: reportando, «Marcar hoyo» no está', () => {
    abrirConLinea({ hoyo: { playLine: [T, alNorte(200)], green: null }, porMarcar: 'green' });
    fireEvent.click(screen.getByRole('button', { name: 'mapa.ahoraNo' }));
    expect(screen.getByRole('button', { name: /mapa\.marcarHoyo/ })).toBeInTheDocument();

    menu();

    expect(screen.queryByRole('button', { name: /mapa\.marcarHoyo/ })).toBeNull();
  });

  it('R-10: lo que ya salió al ocultarse no se vuelve a mandar tras un reporte', () => {
    const { onMuestra, unmount } = abrirConLinea();
    moverLaSalida();
    ocultar();
    expect(onMuestra).toHaveBeenCalledTimes(1);
    menu();
    motivo('WRONG_LINE');
    fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

    unmount();

    expect(onMuestra).toHaveBeenCalledTimes(1);
  });

  // /code-review, 18 oct
  it('C2: si arrastrando la propuesta se sale de 40-750 m, no se envía: se avisa', () => {
    const { onReporte } = abrirConLinea();
    proponer();
    const green = mapas.marcas.filter((m) => !m.quitada && m.opciones.draggable).at(-1);
    act(() => {
      green.setLngLat([T.lon, alNorte(30).lat]);
      green.oyentes.dragend({ target: green });
    });

    fireEvent.click(screen.getByRole('button', { name: 'mapa.enviarReporte' }));

    expect(onReporte).not.toHaveBeenCalled();
    expect(screen.getByText('mapa.fueraDeLimites')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'mapa.enviarReporte' })).toBeInTheDocument();
  });

  it('C3: un doble toque al marcar la salida no pone también el green', () => {
    abrirConLinea();
    menu();
    motivo('WRONG_LINE');
    // El reloj quieto: los dos toques, en el mismo instante
    reloj.mockImplementation(() => 10_000);

    tocar(alNorte(20));
    tocar(alNorte(21));

    expect(screen.getByText('mapa.reporteGreen')).toBeInTheDocument();
    expect(screen.queryByText('mapa.fueraDeLimites')).toBeNull();
  });

  it('C4: con el menú de motivos abierto, los puntos de la línea no se arrastran', () => {
    abrirConLinea();

    menu();

    const puntos = mapas.marcas.filter((m) => !m.quitada && m.mapa);
    expect(puntos.length).toBeGreaterThan(0);
    expect(puntos.every((m) => !m.opciones.draggable)).toBe(true);
  });

  it('P11: mientras se marca el green de un hoyo con salida, sin «⋮»; con «Ahora no», vuelve', () => {
    abrirConLinea({ hoyo: { playLine: [T, alNorte(200)], green: null }, porMarcar: 'green' });

    expect(screen.getByText('mapa.pideGreen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'mapa.reportar' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'mapa.ahoraNo' }));
    expect(screen.getByRole('button', { name: 'mapa.reportar' })).toBeInTheDocument();
  });
});

// Agustín, 19 oct: tocar mide de ti a ese punto, sin el tramo al green (a un
// búnker, al agua, a la bandera de hoy); el recuadro sigue con el green
//
// | Caso | Situación                                  | Qué pasa                                                        |
// |------|--------------------------------------------|-----------------------------------------------------------------|
// | T1   | en la salida, con buen GPS                 | una línea de ti al punto con sus metros; sin tramo al green     |
// | T2   | con un punto tocado                        | la línea del hoyo, sin sus metros; con «Quitar», vuelven         |
// | T3   | a mitad de hoyo, con la línea de ti al green | mide de ti al punto; la línea al green y su codo siguen, sin metros |
// | T4   | sin buena posición                         | de la salida del hoyo al punto; sin salida, del punto al green   |
// | T5   | «Quitar»                                   | quita el punto; sin punto, a mitad de hoyo, quita el codo        |
// | T6   | al tocar                                   | gira hacia el punto solo en la salida con posición               |
// | T7   | otro toque / abrir «⋮»                     | lo sustituye / lo quita                                          |
// | T8   | lectores de pantalla                       | «Hasta ahí N m» (o «de ahí al green» sin salida)                 |
describe('MapaDelHoyo — medir tocando, de ti al punto (19 oct)', () => {
  const M_POR_GRADO = (6371008.8 * Math.PI) / 180;
  const T = { lat: 36.28, lon: -5.33 };
  const alNorte = (m, de = T) => ({ lat: de.lat + m / M_POR_GRADO, lon: de.lon });
  const alEste = (m, de = T) => ({ lat: de.lat, lon: de.lon + m / (M_POR_GRADO * Math.cos((de.lat * Math.PI) / 180)) });
  const tocar = (p) => act(() => mapa().oyentes.click({ lngLat: { lat: p.lat, lng: p.lon } }));
  const en = (p) => [p.lon, p.lat];
  const medida = () => mapa().fuentes.medida.data.features.map((f) => f.geometry.coordinates);
  const vivas = () => mapas.marcas.filter((m) => !m.quitada);
  const elCodo = () => vivas().filter((m) => m.opciones.element?.className.startsWith('h-3.5 ') && m.opciones.element.className.includes('bg-yellow-400'));
  const elPunto = () => vivas().filter((m) => m.opciones.element?.dataset?.punto === 'medido');
  const cifras = (tipo) => vivas().filter((m) => m.opciones.element?.dataset?.tramo === tipo && /mapa\.tramo/.test(m.opciones.element?.textContent ?? '')).map((m) => m.opciones.element.textContent);
  const quitar = () => fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));
  const G300 = alNorte(300);
  const CON_LINEA = { playLine: [T, G300], green: { front: alNorte(290), center: G300, back: alNorte(310) } };
  const abrirConLinea = (props = {}) => {
    const r = abrir({ hoyo: CON_LINEA, par: 3, porMarcar: null, ...props });
    act(() => mapa().oyentes.load());
    return r;
  };
  const desde = (m, precision = 5) => act(() => gps.exito(lectura(alNorte(m).lat, T.lon, precision)));
  const P = alEste(30, alNorte(150));

  let gps;
  let reloj;
  beforeEach(() => {
    mapas.length = 0;
    mapas.marcas = [];
    mapas.sinWebgl = false;
    centro.valor = T;
    gps = gpsFalso();
    vi.stubGlobal('navigator', { ...globalThis.navigator, geolocation: gps });
    let ahora = 0;
    reloj = vi.spyOn(globalThis.performance, 'now').mockImplementation(() => (ahora += 1000));
  });
  afterEach(() => {
    reloj.mockRestore();
    vi.unstubAllGlobals();
  });

  it('T1/T8: en la salida, de ti al punto con sus metros; sin tramo al green, y el recuadro sigue', () => {
    abrirConLinea();
    desde(0);

    tocar(P);

    expect(medida()).toEqual([[en(T), en(P)]]);
    expect(cifras('medida')).toHaveLength(1);
    expect(elPunto()).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent(/mapa\.hastaAhi/);
    expect(screen.queryByText(/mapa\.deAhiAlGreen/)).toBeNull();
    expect(screen.getByTestId('distancia-centro')).toHaveTextContent('300');
  });

  it('T2 (19 oct, en el móvil): con el punto, la línea del hoyo se va entera (con sus metros y sus puntos), el green se queda; con «Quitar», vuelve', () => {
    abrirConLinea();
    desde(0);
    const lineaDelHoyo = () => mapa().fuentes.marcado.data.features.find((f) => f.properties.tipo === 'linea');
    const puntosParaMover = () => vivas().filter((m) => m.opciones.draggable);
    expect(lineaDelHoyo()).toBeDefined();
    expect(puntosParaMover().length).toBeGreaterThan(0);
    expect(cifras('linea')).toHaveLength(1);

    tocar(P);
    expect(lineaDelHoyo()).toBeUndefined();
    expect(puntosParaMover()).toEqual([]);
    expect(mapa().fuentes.hoyo.data.features.some((f) => f.properties.tipo === 'green')).toBe(true);
    expect(cifras('linea')).toEqual([]);
    // Ni su resumen para lectores de pantalla (/code-review)
    expect(screen.queryByTestId('tramos-de-la-linea')).toBeNull();

    quitar();
    expect(lineaDelHoyo()).toBeDefined();
    expect(puntosParaMover().length).toBeGreaterThan(0);
    expect(cifras('linea')).toHaveLength(1);
    expect(screen.getByTestId('tramos-de-la-linea')).toBeInTheDocument();
    expect(medida()).toEqual([]);
    expect(elPunto()).toEqual([]);
  });

  it('T2: también la línea de un hoyo sin green (que no se mueve)', () => {
    abrir({ hoyo: { playLine: [T, G300], green: null }, porMarcar: null });
    act(() => mapa().oyentes.load());
    desde(0);
    const lineaDelHoyo = () => mapa().fuentes.hoyo.data.features.find((f) => f.properties.tipo === 'linea');
    expect(lineaDelHoyo()).toBeDefined();

    tocar(P);

    expect(lineaDelHoyo()).toBeUndefined();
  });

  it('M1 (24 oct; deshace la T3 del 19 oct): a mitad de hoyo mide solo de ti al punto; la línea al green y su codo se esconden', () => {
    abrirConLinea();
    desde(50);
    const codo = elCodo()[0].p;
    expect(medida()).toHaveLength(1);

    tocar(P);

    expect(elCodo()).toHaveLength(0);
    expect(medida()).toEqual([[en(alNorte(50)), en(P)]]);
    expect(cifras('medida')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'mapa.quitarPunto' }));
    expect(elCodo()[0].p).toEqual(codo);
    expect(medida()).toHaveLength(1);
  });

  it.each([
    ['lejos del campo', () => act(() => gps.exito(lectura(40.4, -3.7)))],
    // 25 m: hay posición, pero no basta para medir desde ella (20 m)
    ['con mal GPS', () => desde(150, 25)],
    ['sin permiso de ubicación', () => act(() => gps.error({ code: 1 }))],
  ])('T4: %s, de la salida del hoyo al punto', (_caso, gpsAhora) => {
    abrirConLinea();
    gpsAhora();

    tocar(P);

    expect(medida()).toEqual([[en(T), en(P)]]);
    // Se dice desde dónde, para quien no ve el mapa (/code-review)
    expect(screen.getByRole('status')).toHaveTextContent(/mapa\.hastaAhiDesdeLaSalida/);
  });

  it('T4 (19 oct, en el móvil): sin buena posición, la salida queda marcada como origen; con «Quitar», se va', () => {
    abrirConLinea();
    act(() => gps.exito(lectura(40.4, -3.7)));
    const origen = () => vivas().filter((m) => m.opciones.element?.dataset?.punto === 'origen');

    tocar(P);

    expect(origen()).toHaveLength(1);
    expect(origen()[0].p).toEqual(en(T));
    expect(origen()[0].opciones.draggable).toBeFalsy();
    quitar();
    expect(origen()).toEqual([]);
  });

  it('T4: con buen GPS el origen es tu punto azul: sin marca de salida', () => {
    abrirConLinea();
    desde(0);

    tocar(P);

    expect(vivas().filter((m) => m.opciones.element?.dataset?.punto === 'origen')).toEqual([]);
  });

  it('T4/T8: sin posición ni salida, del punto al green', () => {
    abrir({ hoyo: { playLine: [], green: { center: G300 } }, porMarcar: null });
    act(() => mapa().oyentes.load());
    act(() => gps.exito(lectura(40.4, -3.7)));

    tocar(P);

    expect(medida()).toEqual([[en(P), en(G300)]]);
    expect(screen.getByRole('status')).toHaveTextContent(/mapa\.deAhiAlGreen/);
    expect(screen.getByRole('status')).not.toHaveTextContent(/mapa\.hastaAhi/);
  });

  it('T5: a mitad de hoyo, «Quitar» quita primero el punto y luego el codo movido (vuelve sin tocar, C9)', () => {
    abrirConLinea();
    desde(50);
    const [codo] = elCodo();
    act(() => {
      codo.setLngLat([T.lon, alNorte(100).lat]);
      codo.oyentes.dragend({ target: codo });
    });
    tocar(P);

    quitar();
    expect(medida()).toHaveLength(2);
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(100).lat, 9);
    expect(cifras('medida')).toHaveLength(2);

    quitar();
    expect(elCodo()[0].p[1]).toBeCloseTo(alNorte(175).lat, 9);
    expect(medida()).toEqual([[en(alNorte(50)), en(G300)]]);
    expect(screen.queryByRole('button', { name: 'mapa.quitarPunto' })).toBeNull();
  });

  it('T6: en la salida con posición, gira hacia el punto', () => {
    abrirConLinea();
    desde(0);
    mapa().fitBounds.mockClear();

    tocar(P);

    expect(mapa().fitBounds).toHaveBeenCalledTimes(1);
    expect(mapa().fitBounds.mock.calls[0][1].bearing).toBeCloseTo(rumbo(T, P), 6);
  });

  it('T6: a mitad de hoyo (decidido con el primer GPS bueno), no gira', () => {
    abrirConLinea();
    desde(50);
    mapa().fitBounds.mockClear();

    tocar(alEste(10, alNorte(200)));

    expect(mapa().fitBounds).not.toHaveBeenCalled();
  });

  it('T6 (revisor): en el campo con GPS flojo, tampoco gira', () => {
    abrirConLinea();
    desde(0, 25);
    mapa().fitBounds.mockClear();

    tocar(P);

    expect(mapa().fitBounds).not.toHaveBeenCalled();
  });

  it('M1 (24 oct): con un punto no hay codo que arrastrar; el punto y su única cifra se quedan', () => {
    abrirConLinea();
    desde(50);
    tocar(P);

    expect(elCodo()).toHaveLength(0);
    expect(elPunto()).toHaveLength(1);
    expect(cifras('medida')).toHaveLength(1);
  });

  it('T3 (revisor): un punto tocado antes de decidir la mitad del hoyo se mide luego desde ti', () => {
    abrirConLinea();
    desde(150, 25);
    tocar(P);
    expect(medida()).toEqual([[en(T), en(P)]]);

    desde(150);

    expect(medida()).toContainEqual([en(alNorte(150)), en(P)]);
  });

  it('T7 (revisor): al cancelar un reporte vuelve el codo, no el punto', () => {
    abrirConLinea({ onReporte: vi.fn() });
    desde(50);
    tocar(P);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
    fireEvent.click(screen.getByRole('button', { name: 'mapa.cancelar' }));

    expect(elCodo()).toHaveLength(1);
    expect(elPunto()).toEqual([]);
  });

  it('revisor: el punto no va en el reporte; se manda la línea propuesta', () => {
    const onReporte = vi.fn();
    abrirConLinea({ onReporte });
    desde(0);
    tocar(P);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));
    fireEvent.click(screen.getByRole('button', { name: 'mapa.motivos.WRONG_LINE' }));
    tocar(alNorte(20));
    tocar(alNorte(280));
    fireEvent.click(screen.getByRole('button', { name: 'mapa.enviarReporte' }));

    expect(onReporte).toHaveBeenCalledWith(expect.objectContaining({ tee: alNorte(20), bends: [], greenCenter: alNorte(280) }));
  });

  it('revisor: al cerrar el mapa, el punto se va con él', () => {
    const { unmount } = abrirConLinea();
    desde(0);
    tocar(P);
    const [punto] = elPunto();

    unmount();

    expect(punto.quitada).toBe(true);
  });

  it('T6 (/code-review): lejos de la salida sin la línea desde ti (hoyo sin green), tampoco gira', () => {
    abrir({ hoyo: { playLine: [T, G300], green: null }, porMarcar: null });
    act(() => mapa().oyentes.load());
    desde(150);
    mapa().fitBounds.mockClear();

    tocar(P);

    expect(mapa().fitBounds).not.toHaveBeenCalled();
  });

  it('T6: tras el «No» en un hoyo sin salida (línea desde ti), no gira', () => {
    abrir({ hoyo: { playLine: [], green: { center: G300 } }, porMarcar: 'salidaAlGreen', recoge: true, onMuestra: vi.fn(), par: 4, metros: 300 });
    act(() => mapa().oyentes.load());
    desde(0);
    fireEvent.click(screen.getByRole('button', { name: 'mapa.no' }));
    mapa().fitBounds.mockClear();

    tocar(P);

    expect(mapa().fitBounds).not.toHaveBeenCalled();
  });

  it('T6: lejos del campo, no gira', () => {
    abrirConLinea();
    act(() => gps.exito(lectura(40.4, -3.7)));
    mapa().fitBounds.mockClear();

    tocar(P);

    expect(mapa().fitBounds).not.toHaveBeenCalled();
  });

  it('T7: otro toque sustituye al punto', () => {
    abrirConLinea();
    desde(0);
    tocar(P);

    tocar(alNorte(200));

    expect(medida()).toEqual([[en(T), en(alNorte(200))]]);
    expect(elPunto()).toHaveLength(1);
  });

  it('T7: al pasar a «Marcar el hoyo entero», el punto se quita', () => {
    abrir({ hoyo: { playLine: [], green: { center: G300 } }, porMarcar: 'salidaAlGreen', recoge: true, onMuestra: vi.fn(), par: 4, metros: 300 });
    act(() => mapa().oyentes.load());
    desde(0);
    fireEvent.click(screen.getByRole('button', { name: 'mapa.no' }));
    tocar(P);
    expect(elPunto()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.marcarEntero' }));

    expect(elPunto()).toEqual([]);
  });

  it('T7: al volver a «Marcar hoyo», el punto se quita', () => {
    abrir({ hoyo: { playLine: [T], green: null }, porMarcar: 'green', recoge: true, onMuestra: vi.fn(), par: 4 });
    act(() => mapa().oyentes.load());
    desde(0);
    fireEvent.click(screen.getByRole('button', { name: 'mapa.ahoraNo' }));
    tocar(P);
    expect(elPunto()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.marcarHoyo' }));

    expect(elPunto()).toEqual([]);
  });

  it('T7: al abrir «⋮» para reportar, el punto se quita', () => {
    abrirConLinea({ onReporte: vi.fn() });
    desde(0);
    tocar(P);

    fireEvent.click(screen.getByRole('button', { name: 'mapa.reportar' }));

    expect(elPunto()).toEqual([]);
    expect(medida()).toEqual([]);
  });
});
