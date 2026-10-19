import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import LocalStorageCourseLocationCache from './LocalStorageCourseLocationCache';

describe('LocalStorageCourseLocationCache', () => {
  let guardado;

  beforeEach(() => {
    guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('guarda y lee la ubicación de cada campo por separado', () => {
    const cache = new LocalStorageCourseLocationCache();

    cache.save('gc-1', { lat: 36.29, lon: -5.33 });

    expect(cache.load('gc-1')).toEqual({ lat: 36.29, lon: -5.33 });
    expect(cache.load('gc-2')).toBeNull();
    expect([...guardado.keys()]).toEqual(['ubicacionDelCampo:v1:gc-1']);
  });

  it('lo ilegible, null', () => {
    guardado.set('ubicacionDelCampo:v1:gc-1', '{roto');

    expect(new LocalStorageCourseLocationCache().load('gc-1')).toBeNull();
  });

  it('sin almacenamiento, ni guarda ni revienta', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('no');
      },
      setItem: () => {
        throw new Error('no');
      },
    });
    const cache = new LocalStorageCourseLocationCache();

    expect(() => cache.save('gc-1', { lat: 1, lon: 1 })).not.toThrow();
    expect(cache.load('gc-1')).toBeNull();
  });
});
