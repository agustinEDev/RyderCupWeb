import { describe, it, expect } from 'vitest';
import HoleMarkMapper from './HoleMarkMapper';

const API = {
  hole_number: 3,
  tee: { latitude: 36.28, longitude: -5.33 },
  bends: [{ latitude: 36.2815, longitude: -5.331 }],
  green_center: { latitude: 36.2827, longitude: -5.33 },
  marked_at: '2026-10-15T08:05:00Z',
};

describe('HoleMarkMapper', () => {
  it('de la API al dominio: puntos con nombre a { lat, lon }', () => {
    expect(HoleMarkMapper.toDomain(API)).toEqual({
      holeNumber: 3,
      tee: { lat: 36.28, lon: -5.33 },
      bends: [{ lat: 36.2815, lon: -5.331 }],
      greenCenter: { lat: 36.2827, lon: -5.33 },
      markedAt: '2026-10-15T08:05:00Z',
    });
  });

  it('una marca solo de green llega con tee null y sin codos', () => {
    const marca = HoleMarkMapper.toDomain({ ...API, tee: null, bends: [] });

    expect(marca.tee).toBeNull();
    expect(marca.bends).toEqual([]);
  });

  it('del dominio al cuerpo del PUT, con la hora del jugador (con zona)', () => {
    const cuerpo = HoleMarkMapper.toApi({
      tee: { lat: 36.28, lon: -5.33 },
      bends: [],
      greenCenter: { lat: 36.2827, lon: -5.33 },
      markedAt: '2026-10-15T08:05:00.000Z',
    });

    expect(cuerpo).toEqual({
      tee: { latitude: 36.28, longitude: -5.33 },
      bends: [],
      green_center: { latitude: 36.2827, longitude: -5.33 },
      marked_at: '2026-10-15T08:05:00.000Z',
    });
  });

  it('sin salida, `tee` va como null', () => {
    expect(HoleMarkMapper.toApi({ tee: null, bends: [], greenCenter: { lat: 1, lon: 2 }, markedAt: 'x' }).tee).toBeNull();
  });
});
