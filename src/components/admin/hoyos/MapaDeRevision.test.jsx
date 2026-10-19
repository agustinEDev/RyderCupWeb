import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { encuadreGirado } from '../../../domain/services/geometriaDelHoyo';

/**
 * El mapa de revisar un hoyo (BE #575): las muestras con el color de su barra,
 * lo guardado discontinuo y la línea que se edita, con sus puntos arrastrables.
 *
 * Agustín, 18 oct: ninguna distinción de barras en los mapas.
 *
 * | Caso | Qué                                  | Qué pasa                                              |
 * |------|--------------------------------------|-------------------------------------------------------|
 * | S1   | las muestras y los reportes          | todas en blanco semitransparente, finas; la solo green, un punto blanco |
 * | S6   | un green suelto seleccionado         | su punto en rojo, encima                              |
 * | S11  | la línea que se edita y sus puntos   | siempre en rojo (también lo ya tocado al marcar)      |
 * | S12  | la guardada y la de OSM              | cian y lima, debajo de la roja                        |
 * | M1-M4 | tocar una muestra en el mapa        | `onElegir` con su id; con varias, la primera de la lista; franja de 22 px |
 * | M7   | tocar donde no hay ninguna           | nada                                                  |
 * | M8   | marcando (con onToque)               | el toque es para marcar                               |
 */

const mapas = vi.hoisted(() => []);
vi.mock('maplibre-gl', () => {
  class Evented {
    on(evento, fn) {
      this.oyentes ??= {};
      this.oyentes[evento] = fn;
      return { unsubscribe: () => {} };
    }
  }
  class Map extends Evented {
    constructor(opciones) {
      super();
      this.opciones = opciones;
      this.fuentes = {};
      this.capas = [];
      this.fitBounds = vi.fn();
      this.easeTo = vi.fn();
      this.jumpTo = vi.fn();
      // Lo que hay bajo el dedo: cada test pone lo suyo
      this.queryRenderedFeatures = vi.fn(() => []);
      this.remove = vi.fn();
      mapas.push(this);
    }
    addSource(id, fuente) {
      this.fuentes[id] = fuente;
    }
    addLayer(capa) {
      this.capas.push(capa);
    }
    getSource(id) {
      return this.fuentes[id] ? { setData: (d) => { this.fuentes[id].data = d; } } : undefined;
    }
  }
  class Marker extends Evented {
    constructor(opciones = {}) {
      super();
      this.opciones = opciones;
      this.remove = vi.fn(() => {
        this.quitada = true;
      });
      mapas.marcas = [...(mapas.marcas ?? []), this];
    }
    setLngLat(p) {
      this.p = p;
      return this;
    }
    setDraggable(si) {
      this.opciones.draggable = si;
      return this;
    }
    getLngLat() {
      return { lng: this.p[0], lat: this.p[1] };
    }
    addTo() {
      return this;
    }
  }
  return { Map, Marker, setWorkerUrl: vi.fn() };
});
vi.mock('maplibre-gl/dist/maplibre-gl-worker.mjs?url', () => ({ default: 'worker.js' }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const { default: MapaDeRevision } = await import('./MapaDeRevision');
const { rumbo } = await import('../../../domain/services/geometriaDelHoyo');

const T = { lat: 36.28, lon: -5.33 };
const C = { lat: 36.2815, lon: -5.331 };
const G = { lat: 36.2827, lon: -5.33 };
const LINEA = { tee: T, bends: [C], greenCenter: G };
const MUESTRAS = [
  { id: 's-1', tee: T, bends: [], greenCenter: G },
  { id: 's-2', tee: null, bends: [], greenCenter: C },
];
const vivas = () => (mapas.marcas ?? []).filter((m) => !m.quitada);

describe('MapaDeRevision', () => {
  beforeEach(() => {
    mapas.length = 0;
    mapas.marcas = [];
  });

  it('S1: al cargar, las muestras todas en blanco, finas (la solo green, un punto blanco), lo guardado y la línea; encuadra todo', () => {
    render(<MapaDeRevision muestras={MUESTRAS} guardada={LINEA} linea={LINEA} onLinea={() => {}} />);
    const mapa = mapas.at(-1);

    act(() => mapa.oyentes.load());

    const [completa, soloGreen] = mapa.fuentes.muestras.data.features;
    expect(completa.geometry.type).toBe('LineString');
    expect(completa.properties).toEqual({ id: 's-1', orden: 0 });
    expect(soloGreen.geometry).toEqual({ type: 'Point', coordinates: [C.lon, C.lat] });
    expect(soloGreen.properties).toEqual({ id: 's-2', orden: 1 });
    const lineas = mapa.capas.find((c) => c.id === 'muestras-lineas').paint;
    expect(lineas['line-color']).toBe('#ffffff');
    expect(lineas['line-opacity']).toBeLessThan(1);
    expect(lineas['line-width']).toBeLessThan(mapa.capas.find((c) => c.id === 'linea').paint['line-width']);
    expect(mapa.capas.find((c) => c.id === 'muestras-greens').paint['circle-color']).toBe('#ffffff');
    expect(mapa.fuentes.guardada.data.features[0].geometry.coordinates).toHaveLength(3);
    expect(mapa.fuentes.linea.data.features[0].geometry.coordinates[0]).toEqual([T.lon, T.lat]);
    expect(mapa.fitBounds).toHaveBeenCalled();
  });

  it('los puntos de la línea se arrastran, y al soltar llega la línea movida', () => {
    const onLinea = vi.fn();
    render(<MapaDeRevision muestras={[]} guardada={null} linea={LINEA} onLinea={onLinea} />);
    act(() => mapas.at(-1).oyentes.load());

    const puntos = vivas().filter((m) => m.opciones.draggable);
    expect(puntos).toHaveLength(3);
    act(() => {
      puntos[2].setLngLat([-5.32, 36.29]);
      puntos[2].oyentes.dragend({ target: puntos[2] });
    });

    expect(onLinea).toHaveBeenCalledWith({ tee: T, bends: [C], greenCenter: { lat: 36.29, lon: -5.32 } });
  });

  it('sin línea, no hay puntos que arrastrar', () => {
    render(<MapaDeRevision muestras={MUESTRAS} guardada={null} linea={null} onLinea={() => {}} />);
    act(() => mapas.at(-1).oyentes.load());

    expect(vivas().filter((m) => m.opciones.draggable)).toHaveLength(0);
    expect(mapas.at(-1).fuentes.linea.data.features).toEqual([]);
  });

  it('al cerrarse, quita el mapa', () => {
    const { unmount } = render(<MapaDeRevision muestras={[]} guardada={null} linea={LINEA} onLinea={() => {}} />);

    unmount();

    expect(mapas.at(-1).remove).toHaveBeenCalled();
  });

  it('al cambiar las muestras o lo guardado, se repintan; al cambiar la línea, sus puntos se mueven (no se rehacen)', () => {
    const { rerender } = render(<MapaDeRevision muestras={[]} guardada={null} linea={LINEA} onLinea={() => {}} />);
    const mapa = mapas.at(-1);
    act(() => mapa.oyentes.load());
    const antes = vivas().filter((m) => m.opciones.draggable);

    rerender(<MapaDeRevision muestras={MUESTRAS} guardada={LINEA} linea={{ ...LINEA, greenCenter: C }} onLinea={() => {}} />);

    expect(mapa.fuentes.muestras.data.features).toHaveLength(2);
    expect(mapa.fuentes.guardada.data.features).toHaveLength(1);
    const despues = vivas().filter((m) => m.opciones.draggable);
    expect(despues).toEqual(antes);
    expect(despues[2].p).toEqual([C.lon, C.lat]);
  });

  it('los puntos que se arrastran tienen nombre y 44 px donde tocar', () => {
    render(<MapaDeRevision muestras={[]} guardada={null} linea={LINEA} onLinea={() => {}} />);
    act(() => mapas.at(-1).oyentes.load());

    const [salida, codo, green] = vivas().filter((m) => m.opciones.draggable).map((m) => m.opciones.element);
    expect([salida, codo, green].map((e) => e.getAttribute('aria-label'))).toEqual(['holeReviews.pointTee', 'holeReviews.pointBend', 'holeReviews.pointGreen']);
    expect(salida.className).toContain('h-11');
  });
  describe('marcar desde cero (17 oct)', () => {
    it('con onToque, tocar el mapa da el punto; sin él, no', () => {
      const onToque = vi.fn();
      const { rerender } = render(<MapaDeRevision muestras={[]} guardada={null} linea={null} onLinea={() => {}} onToque={onToque} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      act(() => mapa.oyentes.click({ lngLat: { lng: -5.33, lat: 36.28 } }));
      expect(onToque).toHaveBeenCalledWith({ lat: 36.28, lon: -5.33 });

      rerender(<MapaDeRevision muestras={[]} guardada={null} linea={null} onLinea={() => {}} />);
      act(() => mapa.oyentes.click({ lngLat: { lng: -5.32, lat: 36.29 } }));
      expect(onToque).toHaveBeenCalledTimes(1);
    });

    it('la salida ya tocada se ve en el mapa, y se quita al acabar', () => {
      const { rerender } = render(<MapaDeRevision muestras={[]} guardada={null} linea={null} onLinea={() => {}} onToque={() => {}} marcados={[T]} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      expect(mapa.fuentes.marcados.data.features.map((f) => f.geometry.coordinates)).toEqual([[T.lon, T.lat]]);
      rerender(<MapaDeRevision muestras={[]} guardada={null} linea={LINEA} onLinea={() => {}} marcados={[]} />);
      expect(mapa.fuentes.marcados.data.features).toEqual([]);
    });

    it('sin nada que encuadrar, el mapa parte del campo', () => {
      render(<MapaDeRevision muestras={[]} guardada={null} linea={null} onLinea={() => {}} centro={T} />);
      const mapa = mapas.at(-1);

      expect(mapa.opciones.center).toEqual([T.lon, T.lat]);
      expect(mapa.opciones.zoom).toBeGreaterThanOrEqual(15);
      act(() => mapa.oyentes.load());
      expect(mapa.fitBounds).not.toHaveBeenCalled();
    });

    it('E14: tu posición se ve, y el mapa se centra en ella cada vez que se pide', () => {
      const props = { muestras: [], guardada: null, linea: null, onLinea: () => {} };
      const { rerender } = render(<MapaDeRevision {...props} posicion={null} centrarEnMi={0} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());
      expect(mapa.fuentes.yo.data.features).toEqual([]);

      // Pedido, pero aún sin posición: se espera a que llegue
      rerender(<MapaDeRevision {...props} posicion={null} centrarEnMi={1} />);
      expect(mapa.easeTo).not.toHaveBeenCalled();
      rerender(<MapaDeRevision {...props} posicion={T} centrarEnMi={1} />);
      expect(mapa.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [T.lon, T.lat] }));
      expect(mapa.fuentes.yo.data.features[0].geometry.coordinates).toEqual([T.lon, T.lat]);

      // Moverse no lo recentra; pedirlo otra vez, sí
      rerender(<MapaDeRevision {...props} posicion={G} centrarEnMi={1} />);
      expect(mapa.easeTo).toHaveBeenCalledTimes(1);
      rerender(<MapaDeRevision {...props} posicion={G} centrarEnMi={2} />);
      expect(mapa.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [G.lon, G.lat] }));
    });

    it('bloqueada (mientras se marca), sus puntos no se arrastran; al acabar, sí', () => {
      const props = { muestras: [], guardada: null, linea: LINEA, onLinea: () => {} };
      const { rerender } = render(<MapaDeRevision {...props} bloqueada />);
      act(() => mapas.at(-1).oyentes.load());
      expect(vivas().every((m) => m.opciones.draggable === false)).toBe(true);

      rerender(<MapaDeRevision {...props} bloqueada={false} />);
      expect(vivas().every((m) => m.opciones.draggable === true)).toBe(true);
    });

    it('E14: si la posición llega antes de que cargue el mapa, se centra al cargar', () => {
      render(<MapaDeRevision muestras={[]} guardada={null} linea={null} onLinea={() => {}} posicion={T} centrarEnMi={1} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      expect(mapa.easeTo).toHaveBeenCalledWith(expect.objectContaining({ center: [T.lon, T.lat] }));
    });

    it('T7: la línea de OSM, en su color; sin ella, nada', () => {
      const props = { muestras: [], guardada: null, linea: null, onLinea: () => {} };
      const { rerender } = render(<MapaDeRevision {...props} osm={[T, C, G]} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      expect(mapa.fuentes.osm.data.features[0].geometry.coordinates).toEqual([[T.lon, T.lat], [C.lon, C.lat], [G.lon, G.lat]]);
      expect(mapa.capas.find((c) => c.id === 'osm').paint['line-color']).toBe('#84cc16');
      expect(mapa.fitBounds).toHaveBeenCalled();
      rerender(<MapaDeRevision {...props} osm={null} />);
      expect(mapa.fuentes.osm.data.features).toEqual([]);
    });

    it('S12: las muestras, OSM, lo guardado y la línea, cada uno de su color; la roja, encima', () => {
      render(<MapaDeRevision muestras={MUESTRAS} guardada={LINEA} linea={LINEA} onLinea={() => {}} osm={[T, G]} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      const color = (id) => mapa.capas.find((c) => c.id === id).paint['line-color'];
      expect([color('muestras-lineas'), color('osm'), color('guardada'), color('linea')]).toEqual(['#ffffff', '#84cc16', '#06b6d4', '#dc2626']);
      const orden = mapa.capas.map((c) => c.id);
      expect(orden.indexOf('linea')).toBeGreaterThan(orden.indexOf('guardada'));
      expect(orden.indexOf('linea')).toBeGreaterThan(orden.indexOf('osm'));
      expect(orden.indexOf('linea')).toBeGreaterThan(orden.indexOf('muestras-lineas'));
    });

    it('S11: los puntos de la línea y lo ya tocado al marcar, en rojo', () => {
      render(<MapaDeRevision muestras={[]} guardada={null} linea={LINEA} onLinea={() => {}} marcados={[T]} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      for (const m of vivas()) expect(m.opciones.element.firstChild.className).toContain('bg-red-600');
      expect(mapa.capas.find((c) => c.id === 'marcados').paint['circle-color']).toBe('#dc2626');
    });

    it('S6: un green suelto seleccionado, en rojo y encima de las muestras; al quitarlo, nada', () => {
      const { rerender } = render(<MapaDeRevision muestras={MUESTRAS} guardada={null} linea={null} onLinea={() => {}} destacado={C} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      expect(mapa.fuentes.destacado.data.features.map((f) => f.geometry.coordinates)).toEqual([[C.lon, C.lat]]);
      const capa = mapa.capas.find((c) => c.id === 'destacado');
      expect(capa.paint['circle-color']).toBe('#dc2626');
      const orden = mapa.capas.map((c) => c.id);
      expect(orden.indexOf('destacado')).toBeGreaterThan(orden.indexOf('muestras-greens'));
      for (const id of ['osm', 'guardada', 'linea', 'marcados']) expect(orden.indexOf('destacado')).toBeGreaterThan(orden.indexOf(id));

      rerender(<MapaDeRevision muestras={MUESTRAS} guardada={null} linea={null} onLinea={() => {}} destacado={null} />);
      expect(mapa.fuentes.destacado.data.features).toEqual([]);
      rerender(<MapaDeRevision muestras={MUESTRAS} guardada={null} linea={null} onLinea={() => {}} destacado={G} />);
      expect(mapa.fuentes.destacado.data.features.map((f) => f.geometry.coordinates)).toEqual([[G.lon, G.lat]]);
    });
  });
  describe('M: elegir en el mapa', () => {
    const cargar = (props) => {
      render(<MapaDeRevision muestras={MUESTRAS} guardada={null} linea={null} onLinea={() => {}} {...props} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());
      return mapa;
    };
    const toque = { lngLat: { lat: 36.28, lng: -5.33 }, point: { x: 10, y: 20 } };

    it('M3: cada muestra lleva su id y una franja de 22 px donde tocar, invisible', () => {
      const mapa = cargar({ onElegir: vi.fn() });

      expect(mapa.fuentes.muestras.data.features.map((f) => f.properties)).toEqual([{ id: 's-1', orden: 0 }, { id: 's-2', orden: 1 }]);
      const franja = mapa.capas.find((c) => c.id === 'muestras-toque-lineas');
      expect(franja.paint['line-width']).toBe(22);
      expect(franja.paint['line-opacity']).toBe(0);
      const deLosGreens = mapa.capas.find((c) => c.id === 'muestras-toque-greens');
      expect(deLosGreens.paint['circle-radius']).toBe(11);
      expect(deLosGreens.paint['circle-opacity']).toBe(0);
    });

    it('M1/M2/M4: tocar una muestra da su id; con varias, la primera de la lista', () => {
      const onElegir = vi.fn();
      const mapa = cargar({ onElegir });
      mapa.queryRenderedFeatures.mockReturnValue([{ properties: { id: 's-2', orden: 1 } }, { properties: { id: 's-1', orden: 0 } }]);

      act(() => mapa.oyentes.click(toque));

      expect(mapa.queryRenderedFeatures).toHaveBeenCalledWith(toque.point, { layers: ['muestras-toque-lineas', 'muestras-toque-greens'] });
      expect(onElegir).toHaveBeenCalledWith('s-1');
    });

    it('CodeRabbit: tocar un punto de la línea roja no elige lo que haya debajo', () => {
      const onElegir = vi.fn();
      const mapa = cargar({ onElegir });
      mapa.queryRenderedFeatures.mockReturnValue([{ properties: { id: 's-1', orden: 0 } }]);
      const marca = globalThis.document.createElement('div');
      marca.className = 'maplibregl-marker';
      const bola = globalThis.document.createElement('div');
      marca.appendChild(bola);

      act(() => mapa.oyentes.click({ ...toque, originalEvent: { target: bola } }));

      expect(onElegir).not.toHaveBeenCalled();
    });

    it('M7: donde no hay ninguna, nada', () => {
      const onElegir = vi.fn();
      const mapa = cargar({ onElegir });

      act(() => mapa.oyentes.click(toque));

      expect(onElegir).not.toHaveBeenCalled();
    });

    it('M8: marcando, el toque es para marcar y no elige', () => {
      const onElegir = vi.fn();
      const onToque = vi.fn();
      const mapa = cargar({ onElegir, onToque });
      mapa.queryRenderedFeatures.mockReturnValue([{ properties: { id: 's-1', orden: 0 } }]);

      act(() => mapa.oyentes.click(toque));

      expect(onToque).toHaveBeenCalled();
      expect(onElegir).not.toHaveBeenCalled();
    });

    it('sin onElegir, tocar no hace nada', () => {
      const mapa = cargar({});
      mapa.queryRenderedFeatures.mockReturnValue([{ properties: { id: 's-1', orden: 0 } }]);

      expect(() => act(() => mapa.oyentes.click(toque))).not.toThrow();
    });
  });
  // Agustín, 18 oct: como el del jugador
  //
  // | Caso | Situación                         | Qué hace el mapa                                        |
  // |------|-----------------------------------|---------------------------------------------------------|
  // | A1   | al abrir, con línea roja          | orientado con ella (par 3 al green, 4/5 al primer codo) y encuadrándola |
  // | A1   | sin línea                         | norte arriba, todo a la vista                           |
  // | A2/A4 | `orientar` cambia                | gira y encuadra la línea de ahora, con animación        |
  // | A5   | la línea cambia sin `orientar`    | no gira                                                 |
  describe('A: orientar', () => {
    // Abajo, «Mi posición» y «Orientar»; arriba, la instrucción al marcar (revisor)
    const HUECO = { top: 64, bottom: 120, left: 40, right: 40 };
    const SALIDA = T;
    const CODO = { lat: 36.2815, lon: -5.328 };
    const VERDE = { lat: 36.2827, lon: -5.33 };
    const CON_CODO = { tee: SALIDA, bends: [CODO], greenCenter: VERDE };

    it('A1/A1b: al abrir con línea, par 4: de la salida al primer codo, encuadrando todo, y sin fitBounds', () => {
      // Una muestra muy desviada, al oeste: también a la vista
      const LEJANA = { id: 's-9', tee: { lat: 36.28, lon: -5.336 }, bends: [], greenCenter: { lat: 36.2827, lon: -5.336 } };
      render(<MapaDeRevision muestras={[...MUESTRAS, LEJANA]} guardada={null} linea={CON_CODO} onLinea={() => {}} par={4} orientar={1} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      expect(mapa.jumpTo).toHaveBeenCalledTimes(1);
      expect(mapa.jumpTo.mock.calls[0][0].bearing).toBeCloseTo(rumbo(SALIDA, CODO), 6);
      // Las muestras (una completa y un green) y la roja
      const todo = [T, G, C, LEJANA.tee, LEJANA.greenCenter, SALIDA, CODO, VERDE];
      const entera = encuadreGirado({ playLine: todo, green: null }, rumbo(SALIDA, CODO), { ancho: 360, alto: 640, padding: HUECO });
      expect(mapa.jumpTo.mock.calls[0][0].zoom).toBeCloseTo(entera.zoom, 9);
      expect(mapa.fitBounds).not.toHaveBeenCalled();
    });

    it('A1: par 3, de la salida al green', () => {
      render(<MapaDeRevision muestras={[]} guardada={null} linea={CON_CODO} onLinea={() => {}} par={3} orientar={1} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      expect(mapa.jumpTo.mock.calls[0][0].bearing).toBeCloseTo(rumbo(SALIDA, VERDE), 6);
    });

    it('A1: sin línea, norte arriba y todo a la vista', () => {
      render(<MapaDeRevision muestras={MUESTRAS} guardada={null} linea={null} onLinea={() => {}} par={4} orientar={1} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      expect(mapa.jumpTo).not.toHaveBeenCalled();
      expect(mapa.fitBounds).toHaveBeenCalled();
    });

    it('A2/A4: al pedir orientar otra vez, gira y encuadra la línea de ahora, con animación', () => {
      const { rerender } = render(<MapaDeRevision muestras={[]} guardada={null} linea={CON_CODO} onLinea={() => {}} par={4} orientar={1} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());
      const otra = { tee: VERDE, bends: [], greenCenter: SALIDA };

      rerender(<MapaDeRevision muestras={[]} guardada={null} linea={otra} onLinea={() => {}} par={4} orientar={2} />);

      expect(mapa.easeTo).toHaveBeenCalledTimes(1);
      expect(mapa.easeTo.mock.calls[0][0].bearing).toBeCloseTo(rumbo(VERDE, SALIDA), 6);
      const encuadre = encuadreGirado({ playLine: [VERDE, SALIDA], green: null }, rumbo(VERDE, SALIDA), { ancho: 360, alto: 640, padding: HUECO });
      expect(mapa.easeTo.mock.calls[0][0].zoom).toBeCloseTo(encuadre.zoom, 9);
      expect(mapa.easeTo.mock.calls[0][0].center).toEqual([encuadre.center.lon, encuadre.center.lat]);
    });

    it('A1c (CodeRabbit): pedir orientar sin línea vuelve al norte con todo a la vista', () => {
      const { rerender } = render(<MapaDeRevision muestras={MUESTRAS} guardada={null} linea={CON_CODO} onLinea={() => {}} par={4} orientar={1} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      rerender(<MapaDeRevision muestras={MUESTRAS} guardada={null} linea={null} onLinea={() => {}} par={4} orientar={2} />);

      expect(mapa.easeTo).not.toHaveBeenCalled();
      expect(mapa.fitBounds).toHaveBeenCalledTimes(1);
      expect(mapa.fitBounds.mock.calls[0][1]).toMatchObject({ bearing: 0 });
    });

    it('A5: la línea cambia (arrastrando) sin pedir orientar: no gira', () => {
      const { rerender } = render(<MapaDeRevision muestras={[]} guardada={null} linea={CON_CODO} onLinea={() => {}} par={4} orientar={1} />);
      const mapa = mapas.at(-1);
      act(() => mapa.oyentes.load());

      rerender(<MapaDeRevision muestras={[]} guardada={null} linea={{ ...CON_CODO, tee: C }} onLinea={() => {}} par={4} orientar={1} />);

      expect(mapa.easeTo).not.toHaveBeenCalled();
    });

    it('A1: si se pide antes de que cargue, se orienta al cargar (una vez)', () => {
      const { rerender } = render(<MapaDeRevision muestras={[]} guardada={null} linea={null} onLinea={() => {}} par={4} orientar={0} />);
      const mapa = mapas.at(-1);
      rerender(<MapaDeRevision muestras={[]} guardada={null} linea={CON_CODO} onLinea={() => {}} par={4} orientar={1} />);

      act(() => mapa.oyentes.load());

      expect(mapa.jumpTo).toHaveBeenCalledTimes(1);
      expect(mapa.easeTo).not.toHaveBeenCalled();
    });
  });
});
