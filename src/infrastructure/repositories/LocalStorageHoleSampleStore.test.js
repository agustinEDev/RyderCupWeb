import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import LocalStorageHoleSampleStore from './LocalStorageHoleSampleStore';

/**
 * Las muestras de hoyo en el móvil (BE #532, marcado por par), por barra.
 *
 * | Caso | Qué                                                     | Qué se espera                                           |
 * |------|---------------------------------------------------------|---------------------------------------------------------|
 * | S6   | el resumen de un campo                                  | se guarda y se lee por campo (`v3`), sin jugador en la clave |
 * | S6   | lo ilegible, o de otra forma                            | `null`                                                  |
 * | S7   | la cola, en un móvil compartido                         | cada jugador ve solo la suya (`v2`)                     |
 * | S7   | otra muestra (otro id) del mismo hoyo y barra           | queda solo la última, al final                          |
 * | S7   | otra del mismo hoyo con OTRA barra                      | se quedan las dos                                       |
 * | S7   | la misma muestra (mismo id) otra vez                    | sustituye a la de la cola EN SU SITIO                   |
 * | S7   | quitar la enviada cuando ya la sustituyó otra versión   | la nueva se queda                                       |
 * | S8   | localStorage no deja escribir (lleno, modo privado)     | sigue en memoria: se ve y sigue en la cola              |
 * | S8   | localStorage ni deja leer                               | vacío, sin reventar                                     |
 * | S17  | al arrancar, claves viejas (marcas, muestras v1)         | se borran una vez; lo demás no se toca; sin reventar     |
 */

const RESUMEN = { 3: [{ color: 'YELLOW', gender: 'MALE', primera: { tee: { lat: 1, lon: 2 }, bends: [], greenCenter: { lat: 3, lon: 4 } }, recoge: false }] };
const AMARILLA = { color: 'YELLOW', gender: 'MALE' };
const entrada = ({ id = 'm-1', holeNumber = 3, enCola = '2026-10-16T08:00:00.000Z', golfCourseId = 'gc-1', barra = AMARILLA, lat = 36.28 } = {}) => ({
  id,
  golfCourseId,
  holeNumber,
  barra,
  tee: { lat, lon: -5.33 },
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
      key: (i) => [...guardado.keys()][i] ?? null,
      get length() {
        return guardado.size;
      },
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
      expect([...guardado.keys()]).toEqual(['muestrasDeHoyos:v3:gc-1']);
    });

    it('lo ilegible o con otra forma, null', () => {
      guardado.set('muestrasDeHoyos:v3:gc-1', '{roto');
      guardado.set('muestrasDeHoyos:v3:gc-2', '[1,2]');
      guardado.set('muestrasDeHoyos:v3:gc-3', '"texto"');

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
      store.ponerEnCola('u1', entrada());

      expect(store.cola('u1')).toEqual([entrada()]);
      expect([...guardado.keys()]).toEqual(['muestrasPendientes:v2:u1']);
    });

    it('D19: en un móvil compartido, cada uno ve solo la suya', () => {
      store.ponerEnCola('u1', entrada());
      store.ponerEnCola('u2', entrada({ id: 'm-2' }));

      expect(store.cola('u1')).toEqual([entrada()]);
      expect(store.cola('u2')).toEqual([entrada({ id: 'm-2' })]);
    });

    it('otra (otro id) del mismo hoyo, campo y barra sustituye a la anterior y va al final', () => {
      store.ponerEnCola('u1', entrada());
      store.ponerEnCola('u1', entrada({ id: 'm-4', holeNumber: 4 }));
      store.ponerEnCola('u1', entrada({ id: 'm-5', golfCourseId: 'gc-2' }));
      store.ponerEnCola('u1', entrada({ id: 'm-6', enCola: '2026-10-16T08:30:00.000Z' }));

      expect(store.cola('u1').map((e) => e.id)).toEqual(['m-4', 'm-5', 'm-6']);
    });

    it('del mismo hoyo con otra barra (otro color, u otro género) se quedan todas', () => {
      store.ponerEnCola('u1', entrada());
      store.ponerEnCola('u1', entrada({ id: 'm-2', barra: { color: 'RED', gender: 'MALE' } }));
      store.ponerEnCola('u1', entrada({ id: 'm-3', barra: { color: 'YELLOW', gender: 'FEMALE' } }));
      store.ponerEnCola('u1', entrada({ id: 'm-4', barra: { color: 'YELLOW', gender: null } }));

      expect(store.cola('u1').map((e) => e.id)).toEqual(['m-1', 'm-2', 'm-3', 'm-4']);
    });

    it('sin género cuenta igual que null', () => {
      store.ponerEnCola('u1', entrada({ barra: { color: 'RED', gender: null } }));
      store.ponerEnCola('u1', entrada({ id: 'm-2', barra: { color: 'RED' } }));

      expect(store.cola('u1').map((e) => e.id)).toEqual(['m-2']);
    });

    it('la misma muestra (mismo id) otra vez la sustituye en su sitio', () => {
      store.ponerEnCola('u1', entrada());
      store.ponerEnCola('u1', entrada({ id: 'm-4', holeNumber: 4 }));

      store.ponerEnCola('u1', entrada({ enCola: '2026-10-16T08:10:00.000Z', lat: 36.29 }));

      expect(store.cola('u1')).toEqual([entrada({ enCola: '2026-10-16T08:10:00.000Z', lat: 36.29 }), entrada({ id: 'm-4', holeNumber: 4 })]);
    });

    it('quitar la enviada la saca', () => {
      store.ponerEnCola('u1', entrada());
      store.ponerEnCola('u1', entrada({ id: 'm-4', holeNumber: 4 }));

      store.quitarDeLaCola('u1', entrada());

      expect(store.cola('u1')).toEqual([entrada({ id: 'm-4', holeNumber: 4 })]);
    });

    it('quitar una versión vieja (mismo id, otra hora) no quita la nueva', () => {
      store.ponerEnCola('u1', entrada());
      store.ponerEnCola('u1', entrada({ enCola: '2026-10-16T08:30:00.000Z' }));

      store.quitarDeLaCola('u1', entrada());

      expect(store.cola('u1')).toEqual([entrada({ enCola: '2026-10-16T08:30:00.000Z' })]);
    });

    it('quitar una que ya sustituyó otra (otro id) no quita la nueva', () => {
      store.ponerEnCola('u1', entrada());
      store.ponerEnCola('u1', entrada({ id: 'm-2' }));

      store.quitarDeLaCola('u1', entrada());

      expect(store.cola('u1')).toEqual([entrada({ id: 'm-2' })]);
    });

    it('quitar la de otro jugador no toca la mía', () => {
      store.ponerEnCola('u1', entrada());

      store.quitarDeLaCola('u2', entrada());

      expect(store.cola('u1')).toEqual([entrada()]);
    });

    it('lo ilegible, o entradas rotas, no cuentan', () => {
      guardado.set('muestrasPendientes:v2:u1', '{roto');
      expect(store.cola('u1')).toEqual([]);

      const sin = (clave) => Object.fromEntries(Object.entries(entrada()).filter(([k]) => k !== clave));
      guardado.set('muestrasPendientes:v2:u1', JSON.stringify([entrada(), null, { holeNumber: 4 }, 'x', sin('id'), sin('barra'), sin('enCola')]));
      expect(store.cola('u1')).toEqual([entrada()]);
    });

    it('sin jugador, nada', () => {
      store.ponerEnCola(null, entrada());

      expect(store.cola(null)).toEqual([]);
      expect(guardado.size).toBe(0);
    });

    it('lo leído es una copia: cambiarlo no cambia la cola', () => {
      store.ponerEnCola('u1', entrada());

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

      store.ponerEnCola('u1', entrada());
      expect(store.cola('u1')).toEqual([entrada()]);

      store.quitarDeLaCola('u1', entrada());
      expect(store.cola('u1')).toEqual([]);
    });

    it('si no deja escribir, el resumen sigue en memoria', () => {
      conLocalStorage({ setItem: lleno });

      store.saveResumen('gc-1', RESUMEN);

      expect(store.loadResumen('gc-1')).toEqual(RESUMEN);
    });

    it('la memoria es de cada jugador también', () => {
      conLocalStorage({ setItem: lleno });

      store.ponerEnCola('u1', entrada());

      expect(store.cola('u2')).toEqual([]);
    });

    it('cuando vuelve a dejar escribir, lo de memoria pasa a localStorage', () => {
      conLocalStorage({ setItem: lleno });
      store.ponerEnCola('u1', entrada());
      store.saveResumen('gc-1', RESUMEN);
      conLocalStorage();

      store.ponerEnCola('u1', entrada({ id: 'm-4', holeNumber: 4 }));
      store.saveResumen('gc-1', {});

      expect(JSON.parse(guardado.get('muestrasPendientes:v2:u1'))).toEqual([entrada(), entrada({ id: 'm-4', holeNumber: 4 })]);
      expect(store.loadResumen('gc-1')).toEqual({});
    });

    it('si ni deja leer, vacío y sin reventar', () => {
      const bloqueado = () => {
        throw new globalThis.DOMException('bloqueado', 'SecurityError');
      };
      conLocalStorage({ getItem: bloqueado, setItem: bloqueado });

      expect(store.cola('u1')).toEqual([]);
      expect(store.loadResumen('gc-1')).toBeNull();
      expect(() => store.ponerEnCola('u1', entrada())).not.toThrow();
      expect(store.cola('u1')).toEqual([entrada()]);
    });

    it('sin localStorage en absoluto, tampoco revienta', () => {
      vi.stubGlobal('localStorage', undefined);

      expect(() => new LocalStorageHoleSampleStore()).not.toThrow();
      expect(() => store.saveResumen('gc-1', RESUMEN)).not.toThrow();
      expect(store.loadResumen('gc-1')).toEqual(RESUMEN);
    });
  });

  describe('S17: lo que dejaron las versiones anteriores', () => {
    it('al arrancar se borran las marcas, las muestras v1 y el resumen v2; lo demás se queda', () => {
      guardado.set('marcasDeHoyos:v1:u1', '{}');
      guardado.set('marcasDeHoyos:v1:u2', '{}');
      guardado.set('muestrasDeHoyos:v1:gc-1', '{}');
      guardado.set('muestrasPendientes:v1:u1', '[]');
      // El resumen por barra (v2) ya no se lee desde el 17 oct
      guardado.set('muestrasDeHoyos:v2:gc-1', '{}');
      guardado.set('muestrasDeHoyos:v3:gc-1', '{}');
      guardado.set('mapaDeHoyos:v1:gc-1', '{}');
      guardado.set('otraCosa', 'x');

      new LocalStorageHoleSampleStore();

      expect([...guardado.keys()].sort()).toEqual(['mapaDeHoyos:v1:gc-1', 'muestrasDeHoyos:v3:gc-1', 'otraCosa']);
    });

    it('si localStorage no deja recorrerlo o borrar, no revienta', () => {
      guardado.set('marcasDeHoyos:v1:u1', '{}');
      conLocalStorage({
        removeItem: () => {
          throw new Error('bloqueado');
        },
      });
      expect(() => new LocalStorageHoleSampleStore()).not.toThrow();

      conLocalStorage({
        key: () => {
          throw new Error('bloqueado');
        },
      });
      expect(() => new LocalStorageHoleSampleStore()).not.toThrow();
    });
  });

  // Agustín, 16 oct: el jugador solo ve lo suyo (o lo aprobado), así que lo que
  // ya envió desde este móvil se sigue viendo
  describe('las mías (ya enviadas desde este móvil)', () => {
    it('se guardan por jugador y se leen, con su clave', () => {
      store.apuntarMia('u1', entrada());

      expect(store.mias('u1')).toEqual([entrada()]);
      expect(store.mias('u2')).toEqual([]);
      expect([...guardado.keys()]).toContain('muestrasMias:v1:u1');
    });

    it('de cada hoyo, campo y barra, solo la última', () => {
      store.apuntarMia('u1', entrada({ id: 'a', lat: 1 }));
      store.apuntarMia('u1', entrada({ id: 'b', lat: 2 }));
      store.apuntarMia('u1', entrada({ id: 'c', holeNumber: 4 }));

      expect(store.mias('u1').map((e) => e.id)).toEqual(['b', 'c']);
    });

    it('/code-review: una versión más vieja de la misma muestra no pisa a la nueva', () => {
      store.apuntarMia('u1', entrada({ id: 'x', enCola: '2026-10-16T08:05:00.000Z', lat: 2 }));
      store.apuntarMia('u1', entrada({ id: 'x', enCola: '2026-10-16T08:00:00.000Z', lat: 1 }));

      expect(store.mias('u1').map((e) => e.enCola)).toEqual(['2026-10-16T08:05:00.000Z']);
    });

    it('CodeRabbit: las horas se comparan como instantes, no como texto', () => {
      // 10:00+02:00 son las 08:00Z: más vieja que 08:30Z aunque como texto sea mayor
      store.apuntarMia('u1', entrada({ id: 'x', enCola: '2026-10-16T08:30:00.000Z', lat: 2 }));
      store.apuntarMia('u1', entrada({ id: 'x', enCola: '2026-10-16T10:00:00.000+02:00', lat: 1 }));

      expect(store.mias('u1').map((e) => e.enCola)).toEqual(['2026-10-16T08:30:00.000Z']);
    });

    it('sin jugador, nada', () => {
      store.apuntarMia(null, entrada());

      expect(store.mias(null)).toEqual([]);
      expect(guardado.size).toBe(0);
    });

    it(`como mucho ${500}: más, se olvidan las más viejas`, () => {
      for (let i = 1; i <= 505; i += 1) store.apuntarMia('u1', entrada({ id: `m${i}`, holeNumber: (i % 18) + 1, golfCourseId: `gc-${i}` }));

      const mias = store.mias('u1');
      expect(mias).toHaveLength(500);
      expect(mias[0].id).toBe('m6');
    });

    it('lo ilegible, nada', () => {
      guardado.set('muestrasMias:v1:u1', '{roto');

      expect(store.mias('u1')).toEqual([]);
    });
  });
});
