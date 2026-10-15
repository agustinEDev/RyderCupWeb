import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import LocalStorageHoleMapCache from './LocalStorageHoleMapCache';

const MAPA = { golfCourseId: 'gc-1', version: 'v1', attribution: null, holes: { 1: { green: null, playLine: [] } } };

describe('LocalStorageHoleMapCache', () => {
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

  it('guarda y lee el mapa de un campo', () => {
    const cache = new LocalStorageHoleMapCache();

    cache.save(MAPA);

    expect(cache.load('gc-1')).toEqual(MAPA);
    expect(cache.load('gc-2')).toBeNull();
  });

  it('una versión nueva sustituye a la guardada', () => {
    const cache = new LocalStorageHoleMapCache();
    cache.save(MAPA);

    cache.save({ ...MAPA, version: 'v2' });

    expect(cache.load('gc-1').version).toBe('v2');
  });

  it('borra el mapa de un campo', () => {
    const cache = new LocalStorageHoleMapCache();
    cache.save(MAPA);

    cache.remove('gc-1');

    expect(cache.load('gc-1')).toBeNull();
  });

  it('lo guardado roto se lee como nada, sin romper la pantalla', () => {
    guardado.set('mapaDeHoyos:gc-1', '{no es json');

    expect(new LocalStorageHoleMapCache().load('gc-1')).toBeNull();
  });

  it('sin almacenamiento (modo privado, cuota llena) no revienta', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('denied'); },
    });
    const cache = new LocalStorageHoleMapCache();

    expect(() => cache.save(MAPA)).not.toThrow();
    expect(cache.load('gc-1')).toBeNull();
    expect(() => cache.remove('gc-1')).not.toThrow();
  });
});
