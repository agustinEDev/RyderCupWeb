import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render } from '@testing-library/react';

/**
 * El mapa de revisar un hoyo (BE #575): las muestras con el color de su barra,
 * lo guardado discontinuo y la línea que se edita, con sus puntos arrastrables.
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

const T = { lat: 36.28, lon: -5.33 };
const C = { lat: 36.2815, lon: -5.331 };
const G = { lat: 36.2827, lon: -5.33 };
const LINEA = { tee: T, bends: [C], greenCenter: G };
const MUESTRAS = [
  { id: 's-1', barra: { color: 'YELLOW', gender: 'MALE' }, tee: T, bends: [], greenCenter: G },
  { id: 's-2', barra: { color: 'RED', gender: null }, tee: null, bends: [], greenCenter: C },
];
const vivas = () => (mapas.marcas ?? []).filter((m) => !m.quitada);

describe('MapaDeRevision', () => {
  beforeEach(() => {
    mapas.length = 0;
    mapas.marcas = [];
  });

  it('al cargar, las muestras con el color de su barra (la solo green, como un punto), lo guardado y la línea; encuadra todo', () => {
    render(<MapaDeRevision muestras={MUESTRAS} guardada={LINEA} linea={LINEA} onLinea={() => {}} />);
    const mapa = mapas.at(-1);

    act(() => mapa.oyentes.load());

    const [completa, soloGreen] = mapa.fuentes.muestras.data.features;
    expect(completa.geometry.type).toBe('LineString');
    expect(completa.properties.color).toBe('#facc15');
    expect(soloGreen.geometry).toEqual({ type: 'Point', coordinates: [C.lon, C.lat] });
    expect(soloGreen.properties.color).toBe('#ef4444');
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
  });
});
