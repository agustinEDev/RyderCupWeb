import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Este entorno no trae `localStorage`, y la cola vive ahí. Arriba del todo: en
// un `beforeEach` los módulos ya importados leerían otro objeto
const elDisco = (() => {
  let datos = {};
  return {
    getItem: (clave) => datos[clave] ?? null,
    setItem: (clave, valor) => { datos[clave] = String(valor); },
    removeItem: (clave) => { delete datos[clave]; },
    clear: () => { datos = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: elDisco, writable: true });

import * as golpesPerdidos from '../utils/golpesPerdidos';
import * as cola from '../utils/scoringOfflineQueue';
import { PARO, avisoTrasElVaciado, vaciaAnotaciones } from './vaciaAnotaciones';

const YO = 'usuario-A';
const errorCon = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

/**
 * Con la cola de VERDAD, no con un doble. Es lo que faltaba: con `remove`
 * devolviendo `undefined`, la rama de «no se pudo borrar» se tomaba en cada
 * envío bueno y media política no se ejecutaba nunca en los tests.
 */
const guarda = (matchId, holeNumber, score) => {
  cola.enqueue(matchId, holeNumber, { ownScore: score }, null, YO);
  return cola.deQuien(YO).find((e) => e.matchId === matchId && e.holeNumber === holeNumber);
};

describe('vaciaAnotaciones · la política, en un solo sitio (FE #551)', () => {
  beforeEach(() => {
    elDisco.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('envía, borra y cuenta', async () => {
    const entradas = [guarda('m-1', 1, 4), guarda('m-2', 2, 5)];

    const r = await vaciaAnotaciones({ entradas, manda: vi.fn() });

    expect(r).toEqual({ enviadas: 2, llegaron: 2, descartadas: 0, cambiadas: 0, paroPor: null });
    expect(cola.deQuien(YO)).toHaveLength(0);
  });

  describe('por qué se para', () => {
    it('un fallo que no es de esta anotación para el bucle', async () => {
      const entradas = [guarda('m-1', 1, 4), guarda('m-2', 2, 5)];
      const manda = vi.fn().mockRejectedValue(errorCon(503));

      const r = await vaciaAnotaciones({ entradas, manda });

      expect(manda).toHaveBeenCalledTimes(1);
      expect(r.paroPor).toBe('no-es-de-esta');
      expect(cola.deQuien(YO)).toHaveLength(2);
    });

    it('y no poder BORRAR también, o se reenvía lo que ya llegó', async () => {
      const entradas = [guarda('m-1', 1, 4), guarda('m-2', 2, 5)];
      const manda = vi.fn();
      vi.spyOn(elDisco, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const r = await vaciaAnotaciones({ entradas, manda });

      expect(manda).toHaveBeenCalledTimes(1);
      expect(r.paroPor).toBe('no-se-pudo-borrar');
      // Y no se cuenta como enviada: sigue en la cola
      expect(r.enviadas).toBe(0);
      // Pero SÍ como llegada: el servidor la tiene, y quien pinta la tarjeta
      // tiene que volver a pedirla o la casilla sigue diciendo «Anotar»
      expect(r.llegaron).toBe(1);
    });

    it('y no poder ESCRIBIR el aviso, que es el mismo disco lleno', async () => {
      const entradas = [guarda('m-1', 1, 4), guarda('m-2', 2, 5)];
      const manda = vi.fn().mockRejectedValue(errorCon(409));
      vi.spyOn(elDisco, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const r = await vaciaAnotaciones({ entradas, manda });

      expect(manda).toHaveBeenCalledTimes(1);
      expect(r.paroPor).toBe('no-se-pudo-escribir');
      expect(r.descartadas).toBe(0);
    });

    it('pero un error de la propia anotación NO para: sigue con las demás', async () => {
      // Si parara, una entrada mala a la cabeza dejaría sin enviar los golpes
      // de todas las demás partidas, en cada reconexión, para siempre
      const entradas = [guarda('m-1', 1, 4), guarda('m-2', 2, 5)];
      const manda = vi.fn()
        .mockRejectedValueOnce(new Error('Marked player ID is required'))
        .mockResolvedValue();

      const r = await vaciaAnotaciones({ entradas, manda });

      expect(manda).toHaveBeenCalledTimes(2);
      expect(r).toEqual({ enviadas: 1, llegaron: 1, descartadas: 0, cambiadas: 0, paroPor: null });
      // La mala se queda: no se pierde
      expect(cola.deQuien(YO).map((e) => e.matchId)).toEqual(['m-1']);
    });
  });

  describe('el golpe corregido mientras el bucle iba', () => {
    it('no se manda con el valor viejo', async () => {
      const entradas = [guarda('m-1', 1, 4), guarda('m-2', 7, 6)];
      const manda = vi.fn().mockImplementation(async (entrada) => {
        // Al ir a por la primera, el jugador corrige la segunda
        if (entrada.matchId === 'm-1') cola.enqueue('m-2', 7, { ownScore: 4 }, null, YO);
      });

      const r = await vaciaAnotaciones({ entradas, manda });

      expect(manda).toHaveBeenCalledTimes(1);
      expect(cola.deQuien(YO)).toEqual([
        expect.objectContaining({ matchId: 'm-2', scoreData: { ownScore: 4 } }),
      ]);
      // Y se cuenta: la corrección sigue en la cola sin mandar, y quien llama
      // decide si dar otra pasada ya. Sin el dato, la pasada parecía completa
      expect(r.cambiadas).toBe(1);
    });

    it('ni se borra si se corrigió con la petición en vuelo', async () => {
      const entradas = [guarda('m-1', 1, 4)];
      const manda = vi.fn().mockImplementation(async () => {
        cola.enqueue('m-1', 1, { ownScore: 6 }, null, YO);
      });

      const r = await vaciaAnotaciones({ entradas, manda });

      // Ni se cuenta como enviada: la corrección sigue esperando, y decir que
      // se envió todo apagaba el reintento de quien llama
      expect(r.enviadas).toBe(0);
      // Pero sí como llegada: el servidor tiene el 4, y la foto en memoria no
      expect(r.llegaron).toBe(1);
      expect(r.cambiadas).toBe(1);
      expect(cola.deQuien(YO)).toHaveLength(1);
    });

    it('ni se apunta como perdido, aunque el servidor lo rechace', async () => {
      // Dejaría un aviso permanente pidiendo repetir un hoyo ya corregido
      const entradas = [guarda('m-1', 1, 4)];
      const manda = vi.fn().mockImplementation(async () => {
        cola.enqueue('m-1', 1, { ownScore: 6 }, null, YO);
        throw errorCon(409);
      });

      const r = await vaciaAnotaciones({ entradas, manda });

      expect(golpesPerdidos.pendientes(YO)).toEqual([]);
      expect(r.descartadas).toBe(0);
    });
  });

  it('lo rechazado se aparta DEJANDO AVISO', async () => {
    const entradas = [guarda('m-1', 7, 4)];
    const manda = vi.fn().mockRejectedValue(errorCon(409));

    const r = await vaciaAnotaciones({ entradas, manda });

    expect(r.descartadas).toBe(1);
    expect(golpesPerdidos.pendientes(YO)).toEqual([
      expect.objectContaining({ matchId: 'm-1', holeNumber: 7 }),
    ]);
    expect(cola.deQuien(YO)).toHaveLength(0);
  });

  it('el aviso de pantalla se da ANTES de tocar el disco', async () => {
    // Es lo único que se le puede enseñar a alguien cuyo móvil está lleno
    const entradas = [guarda('m-1', 7, 4)];
    const manda = vi.fn().mockRejectedValue(errorCon(409));
    const alDescartar = vi.fn();
    vi.spyOn(elDisco, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    await vaciaAnotaciones({ entradas, manda, alDescartar });

    expect(alDescartar).toHaveBeenCalledWith(expect.objectContaining({ holeNumber: 7 }));
  });

  it('se consulta a quién saltar EN CADA VUELTA, no una vez', async () => {
    // El bucle tarda, y en ese rato el usuario puede entrar en una de las
    // partidas que se están enviando: su pantalla la vacía ella
    const entradas = [guarda('m-1', 1, 4), guarda('m-2', 2, 5)];
    let abierta = null;
    const manda = vi.fn().mockImplementation(async () => { abierta = 'm-2'; });

    await vaciaAnotaciones({ entradas, manda, seSalta: (e) => e.matchId === abierta });

    expect(manda).toHaveBeenCalledTimes(1);
  });

  it('da señal de vida en cada vuelta, para no darse por colgado', async () => {
    // Dieciocho hoyos a siete segundos pasan de dos minutos: sin esto, un
    // vaciado lento se daba por muerto y se lanzaba otro encima
    const entradas = [guarda('m-1', 1, 4), guarda('m-2', 2, 5)];
    const sigoVivo = vi.fn();

    await vaciaAnotaciones({ entradas, manda: vi.fn(), sigoVivo });

    expect(sigoVivo).toHaveBeenCalledTimes(2);
  });

  it('y si la señal contesta que ya no manda, para sin enviar más', async () => {
    // Otro le tomó el relevo dándolo por colgado: seguir eran dos bucles
    // enviando los mismos hoyos, que es justo lo que el cerrojo evita
    const entradas = [guarda('m-1', 1, 4), guarda('m-2', 2, 5)];
    const manda = vi.fn();
    const sigoVivo = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);

    const r = await vaciaAnotaciones({ entradas, manda, sigoVivo });

    expect(manda).toHaveBeenCalledTimes(1);
    expect(r.paroPor).toBe('ya-hay-otro');
    expect(r.enviadas).toBe(1);
    // La segunda sigue en la cola, para el que tiene ahora el cerrojo
    expect(cola.deQuien(YO).map((e) => e.matchId)).toEqual(['m-2']);
  });

  it('una señal que no contesta nada no para: solo el `false` explícito', async () => {
    // Quien no vigila pasa un `() => {}`; que devuelva `undefined` no puede
    // significar «te relevaron»
    const entradas = [guarda('m-1', 1, 4), guarda('m-2', 2, 5)];
    const manda = vi.fn();

    const r = await vaciaAnotaciones({ entradas, manda, sigoVivo: () => {} });

    expect(manda).toHaveBeenCalledTimes(2);
    expect(r.paroPor).toBeNull();
  });

  it('sigue dando señal de vida MIENTRAS una petición está en vuelo', async () => {
    // Las peticiones no llevan tiempo máximo. Una colgada más de dos minutos
    // dejaba caducar el cerrojo, otra pestaña tomaba el relevo y reenviaba la
    // misma anotación, todavía en camino
    vi.useFakeTimers();
    const entradas = [guarda('m-1', 1, 4)];
    const sigoVivo = vi.fn(() => true);
    let termina;
    const manda = vi.fn(() => new Promise((r) => { termina = r; }));

    const vaciado = vaciaAnotaciones({ entradas, manda, sigoVivo });
    await Promise.resolve();
    expect(sigoVivo).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(150_000);
    // Una al entrar y cinco en vuelo: el cerrojo nunca llegó a los dos minutos
    expect(sigoVivo).toHaveBeenCalledTimes(6);

    termina();
    await vaciado;
    // Y al terminar, se acaba la señal: no queda un temporizador vivo
    vi.advanceTimersByTime(150_000);
    expect(sigoVivo).toHaveBeenCalledTimes(6);
  });

  it('el aviso de una rechazada lleva el nombre que la cola tenga AHORA', async () => {
    // El vaciado de la primera carga arranca antes de que la vista traiga el
    // nombre; `ponleNombre` lo pone en la cola mientras el bucle va. El aviso
    // se apunta al rechazar, y con la copia leída al empezar salía sin nombre
    // para siempre: un aviso apartado ya no está en la cola que se repara
    const entradas = [guarda('m-1', 7, 4)];
    const manda = vi.fn().mockImplementation(async () => {
      cola.ponleNombre('m-1', { matchName: 'Meis', matchNumber: 3 });
      throw errorCon(409);
    });
    const alDescartar = vi.fn();

    await vaciaAnotaciones({ entradas, manda, alDescartar });

    expect(golpesPerdidos.pendientes(YO)).toEqual([
      expect.objectContaining({ holeNumber: 7, matchName: 'Meis', matchNumber: 3 }),
    ]);
    expect(alDescartar).toHaveBeenCalledWith(expect.objectContaining({ matchName: 'Meis' }));
  });

  it('el aviso de una anotación huérfana lleva dueño', async () => {
    // Sin él lo ve TODA cuenta del móvil, y el primero que pulse «Entendido»
    // se lo lleva antes de que lo vea el suyo
    cola.enqueue('m-1', 7, { ownScore: 4 }, null, null);
    const entradas = cola.getAll();
    const manda = vi.fn().mockRejectedValue(errorCon(409));

    await vaciaAnotaciones({ entradas, manda, dueñoSiNoLoTiene: YO });

    expect(golpesPerdidos.pendientes(YO)).toEqual([
      expect.objectContaining({ userId: YO }),
    ]);
    expect(golpesPerdidos.pendientes('cualquier-otra')).toEqual([]);
  });
});

describe('avisoTrasElVaciado (FE #551)', () => {
  it('un paro del almacenamiento lo pone, aunque hubiera otro', () => {
    expect(avisoTrasElVaciado(null, PARO.NO_SE_PUDO_BORRAR)).toBe(PARO.NO_SE_PUDO_BORRAR);
    expect(avisoTrasElVaciado(PARO.NO_SE_PUDO_BORRAR, PARO.NO_SE_PUDO_ESCRIBIR)).toBe(PARO.NO_SE_PUDO_ESCRIBIR);
  });

  it('un paro que se arregla esperando deja el que había: no ha tocado el disco', () => {
    expect(avisoTrasElVaciado(PARO.NO_SE_PUDO_BORRAR, PARO.NO_ES_DE_ESTA)).toBe(PARO.NO_SE_PUDO_BORRAR);
    expect(avisoTrasElVaciado(PARO.NO_SE_PUDO_BORRAR, PARO.YA_HAY_OTRO)).toBe(PARO.NO_SE_PUDO_BORRAR);
    expect(avisoTrasElVaciado(null, PARO.YA_HAY_OTRO)).toBeNull();
  });

  it('una pasada que termina sin pararse lo retira', () => {
    expect(avisoTrasElVaciado(PARO.NO_SE_PUDO_ESCRIBIR, null)).toBeNull();
  });
});
