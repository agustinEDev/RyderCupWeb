import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LocalStorageHoleReportStore from './LocalStorageHoleReportStore';
import IHoleReportStore from '../../domain/repositories/IHoleReportStore';

const CLAVE = (userId) => `reportesDeHoyosPendientes:v1:${userId}`;

// Un localStorage en memoria, con métodos espiables
const crearAlmacen = (inicial = {}) => {
  const datos = new Map(Object.entries(inicial));
  return {
    datos,
    getItem: vi.fn((k) => (datos.has(k) ? datos.get(k) : null)),
    setItem: vi.fn((k, v) => {
      datos.set(k, String(v));
    }),
    removeItem: vi.fn((k) => {
      datos.delete(k);
    }),
    clear: vi.fn(() => datos.clear()),
  };
};

const entrada = (overrides = {}) => ({
  id: 'r-1',
  golfCourseId: 'c-1',
  holeNumber: 7,
  reason: 'WRONG_GREEN',
  enCola: '2026-10-18T10:00:00.000Z',
  tee: { lat: 39.4, lon: -0.33 },
  greenCenter: { lat: 39.41, lon: -0.34 },
  bends: [{ lat: 39.405, lon: -0.335 }],
  ...overrides,
});

describe('LocalStorageHoleReportStore', () => {
  let almacen;
  let store;

  beforeEach(() => {
    almacen = crearAlmacen();
    vi.stubGlobal('localStorage', almacen);
    store = new LocalStorageHoleReportStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('implements IHoleReportStore', () => {
    expect(store).toBeInstanceOf(IHoleReportStore);
  });

  describe('round trip', () => {
    it('starts with an empty queue', () => {
      expect(store.cola('u-1')).toEqual([]);
    });

    it('saves an entry as JSON under the user key and reads it back', () => {
      const e = entrada();
      store.ponerEnCola('u-1', e);

      expect(almacen.setItem).toHaveBeenCalledWith(
        CLAVE('u-1'),
        JSON.stringify([e]),
      );
      expect(store.cola('u-1')).toEqual([e]);
      // Otra instancia lee lo mismo: la copia de verdad está en localStorage
      expect(new LocalStorageHoleReportStore().cola('u-1')).toEqual([e]);
    });

    it('appends new entries in order', () => {
      store.ponerEnCola('u-1', entrada({ id: 'r-1' }));
      store.ponerEnCola('u-1', entrada({ id: 'r-2' }));
      store.ponerEnCola('u-1', entrada({ id: 'r-3' }));

      expect(store.cola('u-1').map((e) => e.id)).toEqual(['r-1', 'r-2', 'r-3']);
    });

    it('replaces an entry with the same id in its place', () => {
      store.ponerEnCola('u-1', entrada({ id: 'r-1' }));
      store.ponerEnCola('u-1', entrada({ id: 'r-2' }));
      store.ponerEnCola('u-1', entrada({ id: 'r-1', reason: 'OTHER' }));

      const cola = store.cola('u-1');
      expect(cola.map((e) => e.id)).toEqual(['r-1', 'r-2']);
      expect(cola[0].reason).toBe('OTHER');
    });

    it('removes the entry with the same id and enCola', () => {
      store.ponerEnCola('u-1', entrada({ id: 'r-1' }));
      store.ponerEnCola('u-1', entrada({ id: 'r-2' }));

      store.quitarDeLaCola('u-1', entrada({ id: 'r-1' }));

      expect(store.cola('u-1').map((e) => e.id)).toEqual(['r-2']);
    });

    it('does not remove a newer version of the same report (different enCola)', () => {
      const vieja = entrada({ enCola: '2026-10-18T10:00:00.000Z' });
      const nueva = entrada({ enCola: '2026-10-18T11:00:00.000Z' });
      store.ponerEnCola('u-1', nueva);

      store.quitarDeLaCola('u-1', vieja);

      expect(store.cola('u-1')).toEqual([nueva]);
    });

    it('removing from an empty queue writes an empty list', () => {
      store.quitarDeLaCola('u-1', entrada());
      expect(almacen.datos.get(CLAVE('u-1'))).toBe('[]');
      expect(store.cola('u-1')).toEqual([]);
    });
  });

  describe('without user', () => {
    it.each([undefined, null, ''])(
      'returns an empty queue and writes nothing for user %j',
      (userId) => {
        store.ponerEnCola(userId, entrada());
        store.quitarDeLaCola(userId, entrada());

        expect(store.cola(userId)).toEqual([]);
        expect(almacen.setItem).not.toHaveBeenCalled();
        expect(almacen.getItem).not.toHaveBeenCalled();
      },
    );
  });

  describe('keys isolation', () => {
    it('keeps one queue per user', () => {
      store.ponerEnCola('u-1', entrada({ id: 'r-1' }));
      store.ponerEnCola('u-2', entrada({ id: 'r-2' }));

      expect(store.cola('u-1').map((e) => e.id)).toEqual(['r-1']);
      expect(store.cola('u-2').map((e) => e.id)).toEqual(['r-2']);

      store.quitarDeLaCola('u-1', entrada({ id: 'r-1' }));
      expect(store.cola('u-1')).toEqual([]);
      expect(store.cola('u-2').map((e) => e.id)).toEqual(['r-2']);
    });

    it('does not touch other keys of localStorage', () => {
      almacen.datos.set('otraCosa', 'intacta');
      store.ponerEnCola('u-1', entrada());
      store.quitarDeLaCola('u-1', entrada());

      expect(almacen.datos.get('otraCosa')).toBe('intacta');
      expect([...almacen.datos.keys()].sort()).toEqual(
        [CLAVE('u-1'), 'otraCosa'].sort(),
      );
      expect(almacen.removeItem).not.toHaveBeenCalled();
      expect(almacen.clear).not.toHaveBeenCalled();
    });
  });

  describe('corrupt or unexpected content', () => {
    it('treats corrupt JSON as an empty queue and overwrites it on the next save', () => {
      almacen.datos.set(CLAVE('u-1'), '{no es json');

      expect(store.cola('u-1')).toEqual([]);

      store.ponerEnCola('u-1', entrada());
      expect(store.cola('u-1')).toEqual([entrada()]);
    });

    it.each([
      ['an object', '{"id":"r-1"}'],
      ['a number', '42'],
      ['a string', '"hola"'],
      ['null', 'null'],
    ])('treats %s as an empty queue', (_, valor) => {
      almacen.datos.set(CLAVE('u-1'), valor);
      expect(store.cola('u-1')).toEqual([]);
    });

    it.each([
      ['null', null],
      ['a non-object', 'r-1'],
      ['no id', { id: '' }],
      ['no golfCourseId', { golfCourseId: null }],
      ['a non-integer holeNumber', { holeNumber: 7.5 }],
      ['a string holeNumber', { holeNumber: '7' }],
      ['no reason', { reason: '' }],
      ['no enCola', { enCola: undefined }],
      ['no tee', { tee: null }],
      ['a tee without lon', { tee: { lat: 39.4 } }],
      ['a NaN green latitude', { greenCenter: { lat: Number.NaN, lon: 1 } }],
      ['a string green longitude', { greenCenter: { lat: 1, lon: '2' } }],
      ['bends that are not a list', { bends: { lat: 1, lon: 2 } }],
      ['a broken bend', { bends: [{ lat: 1, lon: 2 }, { lat: 1 }] }],
    ])('drops an entry with %s and keeps the valid ones', (_, cambio) => {
      const mala =
        cambio === null || typeof cambio !== 'object'
          ? cambio
          : entrada({ id: 'mala', ...cambio });
      const buena = entrada({ id: 'buena' });
      almacen.datos.set(CLAVE('u-1'), JSON.stringify([mala, buena]));

      expect(store.cola('u-1')).toEqual([buena]);
    });

    it.each([
      ['missing', undefined],
      ['null', null],
      ['empty', []],
    ])('accepts an entry with bends %s', (_, bends) => {
      const e = entrada({ bends });
      almacen.datos.set(CLAVE('u-1'), JSON.stringify([e]));
      expect(store.cola('u-1')).toHaveLength(1);
    });

    it('a dropped entry is not written back when another one is saved', () => {
      almacen.datos.set(
        CLAVE('u-1'),
        JSON.stringify([entrada({ id: 'mala', tee: null })]),
      );

      store.ponerEnCola('u-1', entrada({ id: 'nueva' }));

      expect(JSON.parse(almacen.datos.get(CLAVE('u-1')))).toEqual([
        entrada({ id: 'nueva' }),
      ]);
    });
  });

  describe('storage that throws', () => {
    it('returns an empty queue when getItem throws (blocked storage)', () => {
      almacen.getItem.mockImplementation(() => {
        throw new globalThis.DOMException('denied', 'SecurityError');
      });
      expect(store.cola('u-1')).toEqual([]);
    });

    it('keeps the queue in memory when setItem throws (quota / private mode)', () => {
      almacen.setItem.mockImplementation(() => {
        throw new globalThis.DOMException('full', 'QuotaExceededError');
      });

      expect(() =>
        store.ponerEnCola('u-1', entrada({ id: 'r-1' })),
      ).not.toThrow();
      store.ponerEnCola('u-1', entrada({ id: 'r-2' }));

      expect(store.cola('u-1').map((e) => e.id)).toEqual(['r-1', 'r-2']);
      expect(almacen.datos.has(CLAVE('u-1'))).toBe(false);

      store.quitarDeLaCola('u-1', entrada({ id: 'r-1' }));
      expect(store.cola('u-1').map((e) => e.id)).toEqual(['r-2']);
    });

    it('the in-memory copy wins over what localStorage still has', () => {
      almacen.datos.set(
        CLAVE('u-1'),
        JSON.stringify([entrada({ id: 'vieja' })]),
      );
      almacen.setItem.mockImplementation(() => {
        throw new Error('quota');
      });

      store.quitarDeLaCola('u-1', entrada({ id: 'vieja' }));

      expect(store.cola('u-1')).toEqual([]);
    });

    it('returns copies of the in-memory queue, not the stored object', () => {
      almacen.setItem.mockImplementation(() => {
        throw new Error('quota');
      });
      const e = entrada();
      store.ponerEnCola('u-1', e);

      e.reason = 'MUTADA FUERA';
      store.cola('u-1')[0].reason = 'MUTADA AL LEER';

      expect(store.cola('u-1')[0].reason).toBe('WRONG_GREEN');
    });

    it('goes back to localStorage once it can write again', () => {
      almacen.setItem.mockImplementationOnce(() => {
        throw new Error('quota');
      });
      store.ponerEnCola('u-1', entrada({ id: 'r-1' }));
      expect(almacen.datos.has(CLAVE('u-1'))).toBe(false);

      store.ponerEnCola('u-1', entrada({ id: 'r-2' }));

      expect(
        JSON.parse(almacen.datos.get(CLAVE('u-1'))).map((e) => e.id),
      ).toEqual(['r-1', 'r-2']);
      // Sin copia en memoria: lo que cambie en localStorage es lo que se lee
      almacen.datos.set(CLAVE('u-1'), '[]');
      expect(store.cola('u-1')).toEqual([]);
    });

    it('the in-memory copy is per user', () => {
      almacen.setItem.mockImplementation((k, v) => {
        if (k === CLAVE('u-1')) throw new Error('quota');
        almacen.datos.set(k, v);
      });

      store.ponerEnCola('u-1', entrada({ id: 'r-1' }));
      store.ponerEnCola('u-2', entrada({ id: 'r-2' }));

      expect(store.cola('u-1').map((e) => e.id)).toEqual(['r-1']);
      expect(store.cola('u-2').map((e) => e.id)).toEqual(['r-2']);
      expect(almacen.datos.has(CLAVE('u-2'))).toBe(true);
    });
  });
});
