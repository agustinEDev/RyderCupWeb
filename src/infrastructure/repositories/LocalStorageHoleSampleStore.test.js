import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import LocalStorageHoleSampleStore from './LocalStorageHoleSampleStore';

/**
 * Las muestras de hoyo en el móvil (BE #532, marcado por par).
 *
 * | Caso | Qué                                                  | Qué se espera                                          |
 * |------|------------------------------------------------------|--------------------------------------------------------|
 * | S6   | el resumen de un campo                               | se guarda y se lee por campo, sin jugador en la clave  |
 * | S6   | lo ilegible, o de otra forma                         | `null`                                                 |
 * | S7   | la cola, en un móvil compartido                      | cada jugador ve solo la suya                           |
 * | S7   | otra muestra del mismo hoyo                          | queda solo la última (por jugador, campo y hoyo)       |
 * | S7   | quitar la enviada cuando ya hay otra más nueva       | la nueva se queda                                      |
 * | S8   | localStorage no deja escribir (lleno, modo privado)  | sigue en memoria: se ve y sigue en la cola             |
 * | S8   | localStorage ni deja leer                            | vacío, sin reventar                                    |
 */

const RESUMEN = { 3: { primera: { tee: { lat: 1, lon: 2 }, bends: [], greenCenter: { lat: 3, lon: 4 } }, recoge: false } };
const entrada = (holeNumber, enCola = '2026-10-16T08:00:00.000Z', golfCourseId = 'gc-1') => ({
  golfCourseId,
  holeNumber,
  tee: { lat: 36.28, lon: -5.33 },
  bends: [],
  greenCenter: { lat: 36.2827, lon: -5.33 },
  enCola,
});

describe('LocalStorageHoleSampleStore', () => {
  let guardado;
  let store;

  const conLocalStorage = (cambios = {}) =>
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
      ...cambios,
    });

  beforeEach(() => {
    guardado = new Map();
    conLocalStorage();
    store = new LocalStorageHoleSampleStore();
  });

  afterEach(() => vi.unstubAllGlobals());

  describe('S6: el resumen del campo (público)', () => {
    it('se guarda y se lee por campo, con la clave versionada y sin jugador', () => {
      store.saveResumen('gc-1', RESUMEN);

      expect(store.loadResumen('gc-1')).toEqual(RESUMEN);
      expect(store.loadResumen('gc-2')).toBeNull();
      expect([...guardado.keys()]).toEqual(['muestrasDeHoyos:v1:gc-1']);
    });

    it('lo ilegible o con otra forma, null', () => {
      guardado.set('muestrasDeHoyos:v1:gc-1', '{roto');
      guardado.set('muestrasDeHoyos:v1:gc-2', '[1,2]');
      guardado.set('muestrasDeHoyos:v1:gc-3', '"texto"');

      expect(store.loadResumen('gc-1')).toBeNull();
      expect(store.loadResumen('gc-2')).toBeNull();
      expect(store.loadResumen('gc-3')).toBeNull();
    });

    it('sin campo, nada', () => {
      store.saveResumen(null, RESUMEN);

      expect(store.loadResumen(null)).toBeNull();
      expect(guardado.size).toBe(0);
    });
  });

  describe('S7: la cola, por jugador', () => {
    it('sin nada, vacía', () => {
      expect(store.cola('u1')).toEqual([]);
    });

    it('lo puesto en cola se lee tal cual, con la clave del jugador', () => {
      store.ponerEnCola('u1', entrada(3));

      expect(store.cola('u1')).toEqual([entrada(3)]);
      expect([...guardado.keys()]).toEqual(['muestrasPendientes:v1:u1']);
    });

    it('D19: en un móvil compartido, cada uno ve solo la suya', () => {
      store.ponerEnCola('u1', entrada(3));
      store.ponerEnCola('u2', entrada(3, '2026-10-16T09:00:00.000Z'));

      expect(store.cola('u1')).toEqual([entrada(3)]);
      expect(store.cola('u2')).toEqual([entrada(3, '2026-10-16T09:00:00.000Z')]);
    });

    it('otra del mismo hoyo y campo sustituye a la anterior; las de otro hoyo o campo se quedan', () => {
      store.ponerEnCola('u1', entrada(3));
      store.ponerEnCola('u1', entrada(4));
      store.ponerEnCola('u1', entrada(3, '2026-10-16T08:00:00.000Z', 'gc-2'));
      store.ponerEnCola('u1', entrada(3, '2026-10-16T08:30:00.000Z'));

      expect(store.cola('u1')).toEqual([entrada(4), entrada(3, '2026-10-16T08:00:00.000Z', 'gc-2'), entrada(3, '2026-10-16T08:30:00.000Z')]);
    });

    it('quitar la enviada la saca', () => {
      store.ponerEnCola('u1', entrada(3));
      store.ponerEnCola('u1', entrada(4));

      store.quitarDeLaCola('u1', entrada(3));

      expect(store.cola('u1')).toEqual([entrada(4)]);
    });

    it('quitar una que ya sustituyó otra más nueva no quita la nueva', () => {
      store.ponerEnCola('u1', entrada(3));
      store.ponerEnCola('u1', entrada(3, '2026-10-16T08:30:00.000Z'));

      store.quitarDeLaCola('u1', entrada(3));

      expect(store.cola('u1')).toEqual([entrada(3, '2026-10-16T08:30:00.000Z')]);
    });

    it('quitar la de otro jugador no toca la mía', () => {
      store.ponerEnCola('u1', entrada(3));

      store.quitarDeLaCola('u2', entrada(3));

      expect(store.cola('u1')).toEqual([entrada(3)]);
    });

    it('lo ilegible, o entradas rotas, no cuentan', () => {
      guardado.set('muestrasPendientes:v1:u1', '{roto');
      expect(store.cola('u1')).toEqual([]);

      guardado.set('muestrasPendientes:v1:u1', JSON.stringify([entrada(3), null, { holeNumber: 4 }, 'x']));
      expect(store.cola('u1')).toEqual([entrada(3)]);
    });

    it('sin jugador, nada', () => {
      store.ponerEnCola(null, entrada(3));

      expect(store.cola(null)).toEqual([]);
      expect(guardado.size).toBe(0);
    });

    it('lo leído es una copia: cambiarlo no cambia la cola', () => {
      store.ponerEnCola('u1', entrada(3));

      store.cola('u1')[0].holeNumber = 9;

      expect(store.cola('u1')[0].holeNumber).toBe(3);
    });
  });

  describe('S8: sin almacenamiento', () => {
    const lleno = () => {
      throw new globalThis.DOMException('lleno', 'QuotaExceededError');
    };

    it('si no deja escribir, la cola sigue en memoria y se puede vaciar', () => {
      conLocalStorage({ setItem: lleno });

      store.ponerEnCola('u1', entrada(3));
      expect(store.cola('u1')).toEqual([entrada(3)]);

      store.quitarDeLaCola('u1', entrada(3));
      expect(store.cola('u1')).toEqual([]);
    });

    it('si no deja escribir, el resumen sigue en memoria', () => {
      conLocalStorage({ setItem: lleno });

      store.saveResumen('gc-1', RESUMEN);

      expect(store.loadResumen('gc-1')).toEqual(RESUMEN);
    });

    it('la memoria es de cada jugador también', () => {
      conLocalStorage({ setItem: lleno });

      store.ponerEnCola('u1', entrada(3));

      expect(store.cola('u2')).toEqual([]);
    });

    it('cuando vuelve a dejar escribir, lo de memoria pasa a localStorage', () => {
      conLocalStorage({ setItem: lleno });
      store.ponerEnCola('u1', entrada(3));
      store.saveResumen('gc-1', RESUMEN);
      conLocalStorage();

      store.ponerEnCola('u1', entrada(4));
      store.saveResumen('gc-1', {});

      expect(JSON.parse(guardado.get('muestrasPendientes:v1:u1'))).toEqual([entrada(3), entrada(4)]);
      expect(store.loadResumen('gc-1')).toEqual({});
    });

    it('si ni deja leer, vacío y sin reventar', () => {
      const bloqueado = () => {
        throw new globalThis.DOMException('bloqueado', 'SecurityError');
      };
      conLocalStorage({ getItem: bloqueado, setItem: bloqueado });

      expect(store.cola('u1')).toEqual([]);
      expect(store.loadResumen('gc-1')).toBeNull();
      expect(() => store.ponerEnCola('u1', entrada(3))).not.toThrow();
      expect(store.cola('u1')).toEqual([entrada(3)]);
    });

    it('sin localStorage en absoluto, tampoco revienta', () => {
      vi.stubGlobal('localStorage', undefined);

      expect(() => store.saveResumen('gc-1', RESUMEN)).not.toThrow();
      expect(store.loadResumen('gc-1')).toEqual(RESUMEN);
    });
  });
});
