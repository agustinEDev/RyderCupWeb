import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import LocalStorageHoleMarkStore from './LocalStorageHoleMarkStore';

const marca = (hole, markedAt = '2026-10-15T08:00:00.000Z', extra = {}) => ({
  holeNumber: hole,
  tee: { lat: 36.28, lon: -5.33 },
  bends: [],
  greenCenter: { lat: 36.2827, lon: -5.33 },
  markedAt,
  ...extra,
});

describe('LocalStorageHoleMarkStore', () => {
  let guardado;
  let store;

  beforeEach(() => {
    guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
    store = new LocalStorageHoleMarkStore();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('sin nada guardado, vacío', () => {
    expect(store.load('u1', 'gc-1')).toEqual({ marcas: {}, pendientes: {} });
    expect(store.pendientes('u1')).toEqual([]);
  });

  it('una marca recién hecha se ve y queda pendiente', () => {
    store.ponerPendiente('u1', 'gc-1', marca(3));

    expect(store.load('u1', 'gc-1')).toEqual({ marcas: { 3: marca(3) }, pendientes: { 3: marca(3) } });
    expect(store.pendientes('u1')).toEqual([{ golfCourseId: 'gc-1', marca: marca(3) }]);
  });

  it('D19: cada marca es de su dueño (móvil compartido)', () => {
    store.ponerPendiente('u1', 'gc-1', marca(3));
    store.ponerPendiente('u2', 'gc-1', marca(3, '2026-10-15T09:00:00.000Z'));

    expect(store.load('u1', 'gc-1').marcas[3].markedAt).toBe('2026-10-15T08:00:00.000Z');
    expect(store.load('u2', 'gc-1').marcas[3].markedAt).toBe('2026-10-15T09:00:00.000Z');
    expect(store.pendientes('u1')).toHaveLength(1);
    expect(store.pendientes('u2')).toHaveLength(1);
  });

  it('confirmar deja la del servidor y la quita de pendientes', () => {
    store.ponerPendiente('u1', 'gc-1', marca(3));
    const delServidor = marca(3, '2026-10-15T08:00:00Z');

    store.confirmar('u1', 'gc-1', marca(3), delServidor);

    expect(store.load('u1', 'gc-1')).toEqual({ marcas: { 3: delServidor }, pendientes: {} });
  });

  it('confirmar una vieja no quita la nueva que se hizo mientras se enviaba', () => {
    store.ponerPendiente('u1', 'gc-1', marca(3));
    const nueva = marca(3, '2026-10-15T08:10:00.000Z', { bends: [{ lat: 1, lon: 2 }] });
    store.ponerPendiente('u1', 'gc-1', nueva);

    store.confirmar('u1', 'gc-1', marca(3), marca(3));

    expect(store.load('u1', 'gc-1')).toEqual({ marcas: { 3: nueva }, pendientes: { 3: nueva } });
  });

  it('descartar la quita de las marcas y de pendientes', () => {
    store.ponerPendiente('u1', 'gc-1', marca(3));
    store.ponerPendiente('u1', 'gc-1', marca(4));

    store.descartar('u1', 'gc-1', marca(3));

    expect(Object.keys(store.load('u1', 'gc-1').marcas)).toEqual(['4']);
    expect(store.pendientes('u1').map((p) => p.marca.holeNumber)).toEqual([4]);
  });

  it('descartar una vieja no toca la nueva', () => {
    const nueva = marca(3, '2026-10-15T08:10:00.000Z');
    store.ponerPendiente('u1', 'gc-1', nueva);

    store.descartar('u1', 'gc-1', marca(3));

    expect(store.load('u1', 'gc-1')).toEqual({ marcas: { 3: nueva }, pendientes: { 3: nueva } });
  });

  it('lo del servidor sustituye a lo guardado, pero no a lo pendiente', () => {
    store.confirmar('u1', 'gc-1', marca(1), marca(1));
    store.ponerPendiente('u1', 'gc-1', marca(3, '2026-10-15T09:00:00.000Z'));

    store.ponerDelServidor('u1', 'gc-1', [marca(2), marca(3)]);

    const { marcas, pendientes } = store.load('u1', 'gc-1');
    expect(Object.keys(marcas)).toEqual(['2', '3']);
    expect(marcas[3].markedAt).toBe('2026-10-15T09:00:00.000Z');
    expect(Object.keys(pendientes)).toEqual(['3']);
  });

  it('pendientes de todos los campos del jugador', () => {
    store.ponerPendiente('u1', 'gc-1', marca(3));
    store.ponerPendiente('u1', 'gc-2', marca(7));

    expect(store.pendientes('u1').map((p) => [p.golfCourseId, p.marca.holeNumber])).toEqual([
      ['gc-1', 3],
      ['gc-2', 7],
    ]);
  });

  it('D20: las marcas no se borran al cerrar sesión (no las toca nadie más)', () => {
    store.ponerPendiente('u1', 'gc-1', marca(3));
    globalThis.localStorage.removeItem('user');

    expect(store.pendientes('u1')).toHaveLength(1);
  });

  it('sin usuario o sin campo, ni lee ni escribe', () => {
    store.ponerPendiente(null, 'gc-1', marca(3));
    store.ponerPendiente('u1', null, marca(3));

    expect(guardado.size).toBe(0);
    expect(store.load(null, 'gc-1')).toEqual({ marcas: {}, pendientes: {} });
    expect(store.pendientes(null)).toEqual([]);
  });

  it('lo ilegible cuenta como vacío', () => {
    guardado.set('marcasDeHoyos:v1:u1', '{roto');

    expect(store.load('u1', 'gc-1')).toEqual({ marcas: {}, pendientes: {} });
    expect(store.pendientes('u1')).toEqual([]);
  });

  it('sin almacenamiento (modo privado) no revienta', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('no');
      },
      setItem: () => {
        throw new Error('no');
      },
      removeItem: () => {},
    });

    expect(() => store.ponerPendiente('u1', 'gc-1', marca(3))).not.toThrow();
    expect(store.load('u1', 'gc-1')).toEqual({ marcas: {}, pendientes: {} });
  });
});
