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
    guardado.set('mapaDeHoyos:v1:gc-1', '{no es json');

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

describe('LocalStorageHoleMapCache — la forma de lo guardado', () => {
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

  it('se guarda con la versión de su forma en la clave', () => {
    new LocalStorageHoleMapCache().save(MAPA);

    expect([...guardado.keys()].filter((k) => k !== 'mapaDeHoyos:v1:indice')).toEqual(['mapaDeHoyos:v1:gc-1']);
  });

  it('una copia de antes de versionar no se lee', () => {
    guardado.set('mapaDeHoyos:gc-1', JSON.stringify(MAPA));

    expect(new LocalStorageHoleMapCache().load('gc-1')).toBeNull();
  });

  it('una copia sin hoyos, o de otro campo, se lee como nada', () => {
    guardado.set('mapaDeHoyos:v1:gc-1', JSON.stringify({ golfCourseId: 'gc-1', version: 'v1' }));
    guardado.set('mapaDeHoyos:v1:gc-2', JSON.stringify(MAPA));
    const cache = new LocalStorageHoleMapCache();

    expect(cache.load('gc-1')).toBeNull();
    expect(cache.load('gc-2')).toBeNull();
  });
});

describe('LocalStorageHoleMapCache — D4: solo los 20 campos más recientes', () => {
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

  const mapaDe = (n) => ({ ...MAPA, golfCourseId: `gc-${n}` });

  it('al guardar el 21.º, se va el que lleva más sin usarse', () => {
    const cache = new LocalStorageHoleMapCache();
    for (let n = 1; n <= 21; n += 1) cache.save(mapaDe(n));

    expect(cache.load('gc-1')).toBeNull();
    expect(cache.load('gc-2')).toEqual(mapaDe(2));
    expect(cache.load('gc-21')).toEqual(mapaDe(21));
    expect([...guardado.keys()].filter((k) => k.startsWith('mapaDeHoyos:v1:gc-'))).toHaveLength(20);
  });

  it('volver a guardar uno lo hace el más reciente', () => {
    const cache = new LocalStorageHoleMapCache();
    for (let n = 1; n <= 20; n += 1) cache.save(mapaDe(n));

    cache.save(mapaDe(1));
    cache.save(mapaDe(21));

    expect(cache.load('gc-1')).toEqual(mapaDe(1));
    expect(cache.load('gc-2')).toBeNull();
  });

  it('borrar uno lo saca también de la lista', () => {
    const cache = new LocalStorageHoleMapCache();
    for (let n = 1; n <= 20; n += 1) cache.save(mapaDe(n));

    cache.remove('gc-5');
    cache.save(mapaDe(21));

    expect(cache.load('gc-1')).toEqual(mapaDe(1));
  });

  it('una lista rota se rehace sin romper nada', () => {
    guardado.set('mapaDeHoyos:v1:indice', '{rota');
    const cache = new LocalStorageHoleMapCache();

    cache.save(mapaDe(1));

    expect(cache.load('gc-1')).toEqual(mapaDe(1));
  });
});
