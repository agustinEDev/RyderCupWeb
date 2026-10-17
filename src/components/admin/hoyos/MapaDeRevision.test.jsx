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
});
