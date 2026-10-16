import { describe, it, expect } from 'vitest';
import HoleMapMapper from './HoleMapMapper';

const feature = (hole, kind, geometry) => ({
  type: 'Feature',
  geometry,
  properties: { hole, kind, source: 'OSM' },
});

// Lo que devuelve GET /golf-courses/{id}/hole-map (GeoJSON: [longitud, latitud])
const API = {
  golf_course_id: 'gc-1',
  status: 'APPROVED',
  version: '2026-10-15T09:00:00.123456Z',
  attribution: '© OpenStreetMap contributors (ODbL)',
  holes_needing_green: [2],
  geojson: {
    type: 'FeatureCollection',
    features: [
      feature(1, 'play_line', { type: 'LineString', coordinates: [[-5.33, 36.28], [-5.332, 36.29]] }),
      feature(1, 'green_front', { type: 'Point', coordinates: [-5.332, 36.2898] }),
      feature(1, 'green_center', { type: 'Point', coordinates: [-5.332, 36.29] }),
      feature(1, 'green_back', { type: 'Point', coordinates: [-5.332, 36.2902] }),
      feature(1, 'green_outline', { type: 'Polygon', coordinates: [[[-5.3323, 36.2897], [-5.3317, 36.2897], [-5.3317, 36.2903], [-5.3323, 36.2897]]] }),
      feature(2, 'play_line', { type: 'LineString', coordinates: [[-5.332, 36.291], [-5.335, 36.295]] }),
    ],
  },
};

describe('HoleMapMapper.toDomain', () => {
  it('pasa el GeoJSON a hoyos con su green en {lat, lon}', () => {
    const mapa = HoleMapMapper.toDomain(API);

    expect(mapa.golfCourseId).toBe('gc-1');
    expect(mapa.version).toBe('2026-10-15T09:00:00.123456Z');
    expect(mapa.attribution).toBe('© OpenStreetMap contributors (ODbL)');
    expect(mapa.holes[1].green).toEqual({
      front: { lat: 36.2898, lon: -5.332 },
      center: { lat: 36.29, lon: -5.332 },
      back: { lat: 36.2902, lon: -5.332 },
    });
    expect(mapa.holes[1].playLine).toEqual([
      { lat: 36.28, lon: -5.33 },
      { lat: 36.29, lon: -5.332 },
    ]);
  });

  it('un hoyo sin green queda con green null', () => {
    expect(HoleMapMapper.toDomain(API).holes[2].green).toBeNull();
  });

  it('un hoyo que no está en el mapa no existe', () => {
    expect(HoleMapMapper.toDomain(API).holes[3]).toBeUndefined();
  });

  it('un green a medias (sin alguno de sus tres puntos) cuenta como sin green', () => {
    const sinFondo = {
      ...API,
      geojson: { ...API.geojson, features: API.geojson.features.filter((f) => f.properties.kind !== 'green_back') },
    };

    expect(HoleMapMapper.toDomain(sinFondo).holes[1].green).toBeNull();
  });
});
