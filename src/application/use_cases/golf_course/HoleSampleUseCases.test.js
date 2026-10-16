import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GetHoleSamplesUseCase from './GetHoleSamplesUseCase';
import SendHoleSampleUseCase from './SendHoleSampleUseCase';
import SendPendingHoleSamplesUseCase from './SendPendingHoleSamplesUseCase';
import LocalStorageHoleSampleStore from '../../../infrastructure/repositories/LocalStorageHoleSampleStore';
import { crearRecienEnviadas } from './recienEnviadas';

/**
 * Las muestras de hoyo, anónimas y por barra (BE #532, marcado por par): todo
 * sin que el jugador lo note. Ni avisos ni mensajes: lo que el servidor no
 * quiere es un fallo nuestro y va a Sentry.
 *
 * | Caso | Qué                                                    | Qué se espera                                           |
 * |------|--------------------------------------------------------|---------------------------------------------------------|
 * | S9   | el resumen, al momento                                 | el del móvil, por hoyo, sin pedir nada                  |
 * | S9   | el resumen del servidor                                | se guarda en el móvil y se da tal cual                  |
 * | S9   | el servidor falla                                      | el del móvil                                            |
 * | S9   | lo que espera en la cola, del jugador, campo y barra   | por hoyo, la última                                     |
 * | S10  | enviar con red                                         | a la cola ANTES de pedir, con id y barra; al llegar, fuera |
 * | S10  | sin jugador, campo o barra                             | nada                                                    |
 * | S10  | sin id                                                 | nada, y a Sentry (es un fallo del mapa)                 |
 * | S11  | 404 / 422 (rechazo definitivo)                         | fuera de la cola, a Sentry con su código, sin aviso     |
 * | S12  | sin red, 5xx, 429, 401, CSRF, tope                     | se queda en la cola, para la tanda, sin Sentry          |
 * | S12  | un fallo nuestro (ni red ni HTTP)                      | se queda en la cola, a Sentry, no para la tanda         |
 * | S13  | vaciar la cola                                         | solo la de quien tiene la sesión                        |
 * | S13  | sin red / 5xx / 429 / CSRF a mitad                     | se para ahí; lo demás sigue en la cola                  |
 * | S13  | un rechazo definitivo a mitad                          | se descarta y sigue con las demás                       |
 * | S13  | `sigue()` deja de ser cierto (cambió la sesión)        | lo que queda no sale                                    |
 * | S13  | dos vaciados a la vez del mismo jugador                | uno solo; el de otro jugador no espera                  |
 * | S14  | la tanda encuentra una que ya se está enviando         | no la manda dos veces                                   |
 * | S18  | mientras va una tanda lenta, el jugador sustituye una  | la vieja no sale (`sustituida`); la nueva, sí          |
 * | S18  | la misma muestra (mismo id) se envía otra vez           | sustituye a la de la cola; sale una vez                 |
 * | S19  | llega (2xx) y el resumen nuevo falla                    | se sigue viendo en `pendientes`, sin volver a la cola   |
 * | S19  | el siguiente resumen que SÍ carga                       | deja de verse, diga lo que diga                         |
 * | S19  | un resumen pedido ANTES de que llegara                  | no la quita (aún no podía tenerla)                      |
 * | S19  | una nueva del mismo hoyo en la cola                     | se ve la de la cola                                     |
 * | S19  | descartada o pendiente                                  | no se apunta como recién enviada                        |
 */

const SALIDA = { lat: 36.28, lon: -5.33 };
const CODO = { lat: 36.2815, lon: -5.331 };
const GREEN = { lat: 36.2827, lon: -5.33 };
const AHORA = '2026-10-16T08:05:00.000Z';
const SALIDA2 = { lat: 36.2829, lon: -5.33 };
const AMARILLA = { color: 'YELLOW', gender: 'MALE' };
const ROJA = { color: 'RED', gender: 'FEMALE' };
const PRIMERA = { tee: SALIDA, bends: [], greenCenter: GREEN };
// Por hoyo, de cualquier barra (BE #575, 17 oct: una referencia por hoyo)
const RESUMEN = { 3: { primera: PRIMERA, green: GREEN, recoge: true } };

const sinRed = () => Object.assign(new TypeError('sin conexión'), { cause: new TypeError('Failed to fetch') });
const http = (status, errorCode = null) => Object.assign(new Error(`HTTP ${status}`), { status, errorCode });
const csrf = () => Object.assign(new Error('csrf'), { errorCode: 'CSRF_VALIDATION_FAILED' });
const tope = () => Object.assign(new Error('tope'), { name: 'AbortError' });

describe('muestras de hoyo — casos de uso', () => {
  let guardado;
  let store;
  let repo;
  let reportarFallo;
  let enVuelo;
  let recienEnviadas;
  let ids;

  beforeEach(() => {
    guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
    store = new LocalStorageHoleSampleStore();
    repo = {
      sendHoleSample: vi.fn(async () => undefined),
      getHoleSamples: vi.fn(async () => RESUMEN),
    };
    reportarFallo = vi.fn();
    enVuelo = new Set();
    recienEnviadas = crearRecienEnviadas();
    ids = 0;
  });

  afterEach(() => vi.unstubAllGlobals());

  const deps = () => ({ golfCourseRepository: repo, holeSampleStore: store, reportarFallo, enVuelo, recienEnviadas });
  const enviar = (datos = {}, ahora = AHORA) => {
    ids += 1;
    return new SendHoleSampleUseCase({ ...deps(), ahora: () => ahora }).execute({
      userId: 'u1',
      golfCourseId: 'gc-1',
      holeNumber: 3,
      barra: AMARILLA,
      id: `m-${ids}`,
      tee: SALIDA,
      bends: [CODO],
      greenCenter: GREEN,
      ...datos,
    });
  };
  const resumen = () => new GetHoleSamplesUseCase({ golfCourseRepository: repo, holeSampleStore: store, recienEnviadas });

  describe('S9: el resumen del campo', () => {
    it('al momento, el del móvil, el mismo para cualquier barra, sin pedir nada', () => {
      store.saveResumen('gc-1', RESUMEN);

      expect(resumen().guardadas('gc-1')).toEqual(RESUMEN);
      expect(repo.getHoleSamples).not.toHaveBeenCalled();
    });

    it('sin copia en el móvil, vacío', () => {
      expect(resumen().guardadas('gc-1')).toEqual({});
    });

    it('el del servidor se guarda en el móvil y se da tal cual', async () => {
      expect(await resumen().execute('gc-1')).toEqual(RESUMEN);

      expect(repo.getHoleSamples).toHaveBeenCalledWith('gc-1');
      expect(store.loadResumen('gc-1')).toEqual(RESUMEN);
    });

    it.each([
      ['sin red', sinRed()],
      ['servidor caído', http(503)],
      ['campo que no existe', http(404, 'GOLF_COURSE_NOT_FOUND')],
    ])('%s: se queda el del móvil, sin borrarlo', async (_caso, fallo) => {
      store.saveResumen('gc-1', RESUMEN);
      repo.getHoleSamples.mockRejectedValue(fallo);

      expect(await resumen().execute('gc-1')).toEqual(RESUMEN);
      expect(store.loadResumen('gc-1')).toEqual(RESUMEN);
    });

    it('sin campo, nada y sin pedir', async () => {
      expect(await resumen().execute(null)).toEqual({});
      expect(resumen().guardadas(null)).toEqual({});
      expect(repo.getHoleSamples).not.toHaveBeenCalled();
    });

    it('lo pendiente del jugador en ese campo y con esa barra, por hoyo', async () => {
      repo.sendHoleSample.mockRejectedValue(sinRed());
      await enviar({ holeNumber: 3 });
      await enviar({ holeNumber: 5, bends: [] });
      await enviar({ holeNumber: 6, barra: ROJA });
      await enviar({ golfCourseId: 'gc-2', holeNumber: 7 });
      await enviar({ userId: 'u2', holeNumber: 9 });

      expect(resumen().pendientes('u1', 'gc-1', AMARILLA)).toEqual({
        3: { tee: SALIDA, bends: [CODO], greenCenter: GREEN },
        5: { tee: SALIDA, bends: [], greenCenter: GREEN },
      });
      expect(Object.keys(resumen().pendientes('u1', 'gc-1', ROJA))).toEqual(['6']);
      expect(resumen().pendientes('u1', 'gc-1', null)).toEqual({});
      expect(resumen().pendientes(null, 'gc-1', AMARILLA)).toEqual({});
      expect(resumen().pendientes('u1', null, AMARILLA)).toEqual({});
    });
  });

  describe('S10: enviar con red', () => {
    it('a la cola antes de pedir (y se avisa), con id y barra; al llegar sale de ella', async () => {
      let enColaAlEnviar;
      const alQuedarEnCola = vi.fn();
      repo.sendHoleSample.mockImplementation(async () => {
        expect(alQuedarEnCola).toHaveBeenCalled();
        enColaAlEnviar = store.cola('u1');
      });

      const r = await enviar({ alQuedarEnCola });

      expect(enColaAlEnviar).toEqual([
        { id: 'm-1', golfCourseId: 'gc-1', holeNumber: 3, barra: AMARILLA, tee: SALIDA, bends: [CODO], greenCenter: GREEN, enCola: AHORA },
      ]);
      expect(repo.sendHoleSample).toHaveBeenCalledWith('gc-1', 3, { id: 'm-1', barra: AMARILLA, tee: SALIDA, bends: [CODO], greenCenter: GREEN });
      expect(r).toEqual({ estado: 'enviada' });
      expect(store.cola('u1')).toEqual([]);
      expect(reportarFallo).not.toHaveBeenCalled();
    });

    it('sin codos, lista vacía; sin género, null', async () => {
      await enviar({ bends: undefined, barra: { color: 'RED' } });

      expect(repo.sendHoleSample.mock.calls[0][2]).toMatchObject({ bends: [], barra: { color: 'RED', gender: null } });
    });

    // 17 oct: quien no está en la salida manda solo el green
    it('una solo green sale sin salida y sin codos, y se ve como pendiente', async () => {
      await enviar({ tee: null, bends: [] });

      expect(repo.sendHoleSample.mock.calls[0][2]).toMatchObject({ tee: null, bends: [], greenCenter: GREEN });
      expect(resumen().pendientes('u1', 'gc-1', AMARILLA)[3]).toEqual({ tee: null, bends: [], greenCenter: GREEN });
    });

    it.each([
      ['sin jugador', { userId: null }],
      ['sin campo', { golfCourseId: null }],
      ['sin barra', { barra: null }],
      ['con una barra sin color', { barra: { color: '', gender: 'MALE' } }],
    ])('%s, ni cola ni petición ni Sentry', async (_caso, datos) => {
      expect(await enviar(datos)).toEqual({ estado: 'ignorada' });

      expect(repo.sendHoleSample).not.toHaveBeenCalled();
      expect(guardado.size).toBe(0);
      expect(reportarFallo).not.toHaveBeenCalled();
    });

    it('sin id, ni cola ni petición, y a Sentry: el mapa siempre lo pone', async () => {
      expect(await enviar({ id: undefined })).toEqual({ estado: 'ignorada' });

      expect(repo.sendHoleSample).not.toHaveBeenCalled();
      expect(guardado.size).toBe(0);
      expect(reportarFallo).toHaveBeenCalledWith(expect.any(Error), { golfCourseId: 'gc-1', holeNumber: 3 });
    });

    it('si mientras se envía se hace otra del mismo hoyo y barra, al llegar la primera se queda la nueva', async () => {
      let soltar;
      repo.sendHoleSample.mockImplementationOnce(() => new Promise((r) => (soltar = r)));
      const primera = enviar();
      repo.sendHoleSample.mockRejectedValueOnce(sinRed());
      await enviar({}, '2026-10-16T08:06:00.000Z');

      soltar();
      await primera;

      expect(store.cola('u1').map((e) => e.id)).toEqual(['m-2']);
    });
  });

  describe('S11: el servidor no la quiere (fallo nuestro)', () => {
    it.each([
      [404, 'GOLF_COURSE_NOT_FOUND'],
      [422, 'HOLE_NOT_IN_COURSE'],
      [422, null],
      [400, null],
    ])('%i %s: fuera de la cola y a Sentry con su código', async (status, errorCode) => {
      repo.sendHoleSample.mockRejectedValue(http(status, errorCode));

      const r = await enviar();

      expect(r).toEqual({ estado: 'descartada', errorCode });
      expect(store.cola('u1')).toEqual([]);
      expect(reportarFallo).toHaveBeenCalledTimes(1);
      expect(reportarFallo).toHaveBeenCalledWith(expect.any(Error), { golfCourseId: 'gc-1', holeNumber: 3, status, errorCode });
    });
  });

  describe('S12: no llegó, o no es el momento', () => {
    it.each([
      ['sin red', sinRed()],
      ['servidor caído', http(503)],
      ['error del servidor', http(500)],
      ['tope de peticiones', http(429)],
      ['sesión', http(401)],
      ['CSRF caducado', csrf()],
      ['tope de la petición', tope()],
    ])('%s: se queda en la cola, para la tanda y no va a Sentry', async (_caso, fallo) => {
      repo.sendHoleSample.mockRejectedValue(fallo);

      const r = await enviar();

      expect(r).toEqual({ estado: 'pendiente', paraLaTanda: true });
      expect(store.cola('u1')).toHaveLength(1);
      expect(reportarFallo).not.toHaveBeenCalled();
    });

    it('un fallo nuestro (ni red ni HTTP) se queda en la cola, va a Sentry y no para la tanda', async () => {
      repo.sendHoleSample.mockRejectedValue(new RangeError('algo nuestro'));

      expect(await enviar()).toEqual({ estado: 'pendiente', paraLaTanda: false });
      expect(store.cola('u1')).toHaveLength(1);
      expect(reportarFallo).toHaveBeenCalledWith(expect.any(RangeError), { golfCourseId: 'gc-1', holeNumber: 3 });
    });
  });

  describe('S13: vaciar la cola', () => {
    const pendiente = async (golfCourseId, holeNumber, userId = 'u1') => {
      repo.sendHoleSample.mockRejectedValueOnce(sinRed());
      await enviar({ golfCourseId, holeNumber, userId });
    };
    const vaciado = () => new SendPendingHoleSamplesUseCase(deps());
    const preparar = () => {
      repo.sendHoleSample.mockClear();
      reportarFallo.mockClear();
    };

    it('con red, salen todas las del jugador', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-2', 7);
      preparar();

      const cuenta = await vaciado().execute('u1');

      expect(cuenta).toEqual({ enviadas: 2, descartadas: 0, pendientes: 0 });
      expect(repo.sendHoleSample.mock.calls.map((c) => [c[0], c[1], c[2].id])).toEqual([
        ['gc-1', 3, 'm-1'],
        ['gc-2', 7, 'm-2'],
      ]);
      expect(store.cola('u1')).toEqual([]);
    });

    it('D19: solo las de quien tiene la sesión', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-1', 3, 'u2');
      preparar();

      await vaciado().execute('u1');

      expect(repo.sendHoleSample).toHaveBeenCalledTimes(1);
      expect(store.cola('u2')).toHaveLength(1);
    });

    it('sin red se para en la primera y no sigue intentando', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-1', 4);
      preparar();
      repo.sendHoleSample.mockRejectedValue(sinRed());

      const cuenta = await vaciado().execute('u1');

      expect(repo.sendHoleSample).toHaveBeenCalledTimes(1);
      expect(cuenta).toEqual({ enviadas: 0, descartadas: 0, pendientes: 2 });
      expect(store.cola('u1')).toHaveLength(2);
    });

    it.each([
      ['el servidor caído (5xx)', http(503)],
      ['el tope de peticiones (429)', http(429)],
      ['la sesión (401)', http(401)],
      ['un CSRF caducado (FE #521: no se repite por muestra)', csrf()],
      ['el tope del refresco del token', tope()],
    ])('%s para la tanda y no va a Sentry', async (_caso, fallo) => {
      await pendiente('gc-1', 3);
      await pendiente('gc-2', 7);
      preparar();
      repo.sendHoleSample.mockRejectedValue(fallo);

      const cuenta = await vaciado().execute('u1');

      expect(repo.sendHoleSample).toHaveBeenCalledTimes(1);
      expect(cuenta).toEqual({ enviadas: 0, descartadas: 0, pendientes: 2 });
      expect(reportarFallo).not.toHaveBeenCalled();
    });

    it('un fallo nuestro va a Sentry y sigue con las demás', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-2', 7);
      preparar();
      repo.sendHoleSample.mockRejectedValueOnce(new RangeError('algo nuestro'));

      const cuenta = await vaciado().execute('u1');

      expect(repo.sendHoleSample).toHaveBeenCalledTimes(2);
      expect(cuenta).toEqual({ enviadas: 1, descartadas: 0, pendientes: 1 });
      expect(reportarFallo).toHaveBeenCalledTimes(1);
    });

    it('un rechazo definitivo se descarta, va a Sentry una vez y sigue con las demás', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-1', 4);
      preparar();
      repo.sendHoleSample.mockRejectedValueOnce(http(422, 'HOLE_NOT_IN_COURSE'));

      const cuenta = await vaciado().execute('u1');

      expect(cuenta).toEqual({ enviadas: 1, descartadas: 1, pendientes: 0 });
      expect(store.cola('u1')).toEqual([]);
      expect(reportarFallo).toHaveBeenCalledTimes(1);
      expect(reportarFallo).toHaveBeenCalledWith(expect.any(Error), {
        golfCourseId: 'gc-1',
        holeNumber: 3,
        status: 422,
        errorCode: 'HOLE_NOT_IN_COURSE',
      });
    });

    it('D19: si cambia la sesión a mitad, lo que queda no sale', async () => {
      await pendiente('gc-1', 3);
      await pendiente('gc-1', 4);
      preparar();
      let sesion = true;
      repo.sendHoleSample.mockImplementationOnce(async () => {
        sesion = false;
      });

      const cuenta = await vaciado().execute('u1', { sigue: () => sesion });

      expect(repo.sendHoleSample).toHaveBeenCalledTimes(1);
      expect(cuenta).toEqual({ enviadas: 1, descartadas: 0, pendientes: 1 });
      expect(store.cola('u1')).toHaveLength(1);
    });

    it('si ya no sigue antes de empezar, no sale ninguna', async () => {
      await pendiente('gc-1', 3);
      preparar();

      const cuenta = await vaciado().execute('u1', { sigue: () => false });

      expect(repo.sendHoleSample).not.toHaveBeenCalled();
      expect(cuenta).toEqual({ enviadas: 0, descartadas: 0, pendientes: 1 });
    });

    it('dos vaciados a la vez son uno solo', async () => {
      await pendiente('gc-1', 3);
      preparar();
      const uno = vaciado();

      await Promise.all([uno.execute('u1'), uno.execute('u1')]);

      expect(repo.sendHoleSample).toHaveBeenCalledTimes(1);
    });

    it('acabado un vaciado, el siguiente vuelve a mirar', async () => {
      const uno = vaciado();
      await uno.execute('u1');
      await pendiente('gc-1', 3);
      preparar();

      await uno.execute('u1');

      expect(repo.sendHoleSample).toHaveBeenCalledTimes(1);
    });

    it('la tanda en marcha es por jugador: la de otro no espera a la del primero', async () => {
      await pendiente('gc-1', 3);
      preparar();
      let soltar;
      repo.sendHoleSample.mockImplementationOnce(() => new Promise((r) => (soltar = r)));
      const uno = vaciado();

      const deU1 = uno.execute('u1');
      const deU2 = await uno.execute('u2');

      expect(deU2).toEqual({ enviadas: 0, descartadas: 0, pendientes: 0 });
      soltar();
      await deU1;
    });

    it('si la sesión cambió y volvió al mismo jugador, la tanda nueva va detrás de la que se corta', async () => {
      await pendiente('gc-1', 3);
      preparar();
      const uno = vaciado();
      const vieja = uno.execute('u1', { sigue: () => false });

      const nueva = uno.execute('u1', { sigue: () => true });
      await vieja;
      const cuenta = await nueva;

      expect(nueva).not.toBe(vieja);
      expect(repo.sendHoleSample).toHaveBeenCalledTimes(1);
      expect(cuenta.enviadas).toBe(1);
      expect(store.cola('u1')).toEqual([]);
    });

    it('si no deja leer ni escribir el móvil, la cola vive en memoria y se vacía igual', async () => {
      const bloqueado = () => {
        throw new globalThis.DOMException('bloqueado', 'SecurityError');
      };
      vi.stubGlobal('localStorage', { getItem: bloqueado, setItem: bloqueado, removeItem: bloqueado });
      await pendiente('gc-1', 3);
      preparar();

      expect(await vaciado().execute('u1')).toEqual({ enviadas: 1, descartadas: 0, pendientes: 0 });
      expect(store.cola('u1')).toEqual([]);
    });
  });

  describe('S14: una que ya va de camino', () => {
    it('la tanda no la manda otra vez mientras su envío sigue en marcha', async () => {
      let soltar;
      repo.sendHoleSample.mockImplementationOnce(() => new Promise((r) => (soltar = r)));
      const enMarcha = enviar();

      const cuenta = await new SendPendingHoleSamplesUseCase(deps()).execute('u1');

      expect(repo.sendHoleSample).toHaveBeenCalledTimes(1);
      expect(cuenta).toEqual({ enviadas: 0, descartadas: 0, pendientes: 0 });
      soltar();
      expect(await enMarcha).toEqual({ estado: 'enviada' });
    });

    it('acabado su envío (aunque falle), la tanda ya puede mandarla', async () => {
      repo.sendHoleSample.mockRejectedValueOnce(sinRed());
      await enviar();

      const cuenta = await new SendPendingHoleSamplesUseCase(deps()).execute('u1');

      expect(cuenta.enviadas).toBe(1);
      expect(enVuelo.size).toBe(0);
    });
  });

  describe('S18: sustituida mientras esperaba', () => {
    it('una tanda lenta no manda la vieja de un hoyo que el jugador ya ha vuelto a marcar', async () => {
      // En la cola: el hoyo 4 (m-1) y el 3 (m-2)
      repo.sendHoleSample.mockRejectedValueOnce(sinRed());
      await enviar({ holeNumber: 4 });
      repo.sendHoleSample.mockRejectedValueOnce(sinRed());
      await enviar({ holeNumber: 3 });
      repo.sendHoleSample.mockClear();
      // La tanda empieza por el 4, que tarda
      let soltar;
      repo.sendHoleSample.mockImplementationOnce(() => new Promise((r) => (soltar = r)));
      const tanda = new SendPendingHoleSamplesUseCase(deps()).execute('u1');
      await vi.waitFor(() => expect(repo.sendHoleSample).toHaveBeenCalledTimes(1));

      // Mientras, el jugador vuelve a marcar el 3 (otra muestra, m-3), que tampoco sale aún
      repo.sendHoleSample.mockRejectedValueOnce(sinRed());
      await enviar({ holeNumber: 3 }, '2026-10-16T08:10:00.000Z');
      soltar();
      const cuenta = await tanda;

      expect(repo.sendHoleSample.mock.calls.map((c) => c[2].id)).toEqual(['m-1', 'm-3']);
      expect(cuenta).toEqual({ enviadas: 1, descartadas: 0, pendientes: 0 });
      expect(store.cola('u1').map((e) => e.id)).toEqual(['m-3']);
    });

    it('lo mismo con la misma muestra (mismo id) cambiada: sale la versión nueva, no la vieja', async () => {
      repo.sendHoleSample.mockRejectedValueOnce(sinRed());
      await enviar({ holeNumber: 4, id: 'otro' });
      repo.sendHoleSample.mockRejectedValueOnce(sinRed());
      await enviar({ holeNumber: 3, id: 'x' });
      repo.sendHoleSample.mockClear();
      let soltar;
      repo.sendHoleSample.mockImplementationOnce(() => new Promise((r) => (soltar = r)));
      const tanda = new SendPendingHoleSamplesUseCase(deps()).execute('u1');
      await vi.waitFor(() => expect(repo.sendHoleSample).toHaveBeenCalledTimes(1));

      repo.sendHoleSample.mockRejectedValueOnce(sinRed());
      await enviar({ holeNumber: 3, id: 'x', greenCenter: CODO }, '2026-10-16T08:10:00.000Z');
      soltar();
      await tanda;

      // La tanda no vuelve a mandar la vieja de 'x': la versión nueva ya salió (sin red) y espera
      expect(repo.sendHoleSample.mock.calls.map((c) => [c[2].id, c[2].greenCenter])).toEqual([
        ['otro', GREEN],
        ['x', CODO],
      ]);
      expect(store.cola('u1')).toEqual([expect.objectContaining({ id: 'x', greenCenter: CODO })]);
    });

    it('la misma muestra (mismo id) enviada dos veces sin red queda una sola vez en la cola, en su sitio', async () => {
      repo.sendHoleSample.mockRejectedValue(sinRed());
      await enviar({ holeNumber: 3, id: 'x' });
      await enviar({ holeNumber: 4, id: 'y' });
      await enviar({ holeNumber: 3, id: 'x', greenCenter: CODO }, '2026-10-16T08:10:00.000Z');
      repo.sendHoleSample.mockReset();
      repo.sendHoleSample.mockResolvedValue(undefined);

      const cuenta = await new SendPendingHoleSamplesUseCase(deps()).execute('u1');

      expect(repo.sendHoleSample.mock.calls.map((c) => c[2].id)).toEqual(['x', 'y']);
      expect(repo.sendHoleSample.mock.calls[0][2].greenCenter).toEqual(CODO);
      expect(cuenta.enviadas).toBe(2);
    });
  });

  describe('S19: recién enviada, mientras el resumen no la trae', () => {
    const PUNTOS = { tee: SALIDA, bends: [CODO], greenCenter: GREEN };

    it('llega y el resumen falla: se sigue viendo como pendiente, sin volver a la cola', async () => {
      await enviar();
      repo.getHoleSamples.mockRejectedValue(sinRed());

      await resumen().execute('gc-1', AMARILLA);

      expect(store.cola('u1')).toEqual([]);
      expect(resumen().pendientes('u1', 'gc-1', AMARILLA)).toEqual({ 3: PUNTOS });
    });

    it('el siguiente resumen que carga la quita, diga lo que diga', async () => {
      await enviar();
      repo.getHoleSamples.mockRejectedValueOnce(sinRed());
      await resumen().execute('gc-1', AMARILLA);
      repo.getHoleSamples.mockResolvedValueOnce({});

      await resumen().execute('gc-1', AMARILLA);

      // De las recién enviadas se va; se sigue viendo porque es suya (16 oct)
      expect(recienEnviadas.de('u1', 'gc-1', AMARILLA)).toEqual({});
    });

    it('vale para cualquier barra: el resumen de otro jugador o barra del mismo campo también la quita', async () => {
      await enviar();

      await resumen().execute('gc-1', ROJA);

      expect(recienEnviadas.de('u1', 'gc-1', AMARILLA)).toEqual({});
    });

    it('el resumen de OTRO campo no la quita', async () => {
      await enviar();

      await resumen().execute('gc-2', AMARILLA);

      expect(resumen().pendientes('u1', 'gc-1', AMARILLA)).toEqual({ 3: PUNTOS });
    });

    it('no se vuelve a enviar: la cola de fondo no la ve', async () => {
      await enviar();
      repo.sendHoleSample.mockClear();

      const cuenta = await new SendPendingHoleSamplesUseCase(deps()).execute('u1');

      expect(repo.sendHoleSample).not.toHaveBeenCalled();
      expect(cuenta).toEqual({ enviadas: 0, descartadas: 0, pendientes: 0 });
    });

    it('la que sale desde la cola de fondo también se apunta', async () => {
      repo.sendHoleSample.mockRejectedValueOnce(sinRed());
      await enviar();
      await new SendPendingHoleSamplesUseCase(deps()).execute('u1');

      expect(store.cola('u1')).toEqual([]);
      expect(resumen().pendientes('u1', 'gc-1', AMARILLA)).toEqual({ 3: PUNTOS });
    });

    it('un resumen pedido ANTES de que llegara no la quita, aunque cargue', async () => {
      let responder;
      repo.getHoleSamples.mockReturnValueOnce(new Promise((r) => (responder = r)));
      const pedido = resumen().execute('gc-1', AMARILLA);
      await enviar();

      responder({});
      await pedido;

      expect(resumen().pendientes('u1', 'gc-1', AMARILLA)).toEqual({ 3: PUNTOS });
    });

    it('es de su jugador y su barra', async () => {
      await enviar();

      expect(resumen().pendientes('u2', 'gc-1', AMARILLA)).toEqual({});
      expect(resumen().pendientes('u1', 'gc-1', ROJA)).toEqual({});
    });

    it('si hay otra nueva del mismo hoyo en la cola, se ve la de la cola', async () => {
      await enviar();
      repo.sendHoleSample.mockRejectedValueOnce(sinRed());
      await enviar({ greenCenter: CODO });

      expect(resumen().pendientes('u1', 'gc-1', AMARILLA)[3].greenCenter).toEqual(CODO);
    });

    it.each([
      ['descartada', http(422, 'HOLE_NOT_IN_COURSE')],
      ['pendiente', sinRed()],
    ])('una %s no se apunta como recién enviada', async (_caso, fallo) => {
      repo.sendHoleSample.mockRejectedValueOnce(fallo);
      await enviar();
      store.quitarDeLaCola('u1', store.cola('u1')[0] ?? { id: 'nada' });

      expect(resumen().pendientes('u1', 'gc-1', AMARILLA)).toEqual({});
    });
  });

  // Agustín, 16 oct: el jugador solo ve lo suyo; lo enviado desde este móvil sigue a la vista
  describe('las mías', () => {
    it('al llegar al servidor, se apunta como mía y se sigue viendo después del resumen', async () => {
      await enviar();
      await resumen().execute('gc-1', AMARILLA);

      expect(resumen().pendientes('u1', 'gc-1', AMARILLA)).toEqual({ 3: { tee: SALIDA, bends: [CODO], greenCenter: GREEN } });
    });

    it('la de la cola (más nueva) va antes que la ya enviada', async () => {
      await enviar();
      repo.sendHoleSample.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      await enviar({ greenCenter: SALIDA2 });

      expect(resumen().pendientes('u1', 'gc-1', AMARILLA)[3].greenCenter).toEqual(SALIDA2);
    });

    it('una descartada por el servidor no se apunta', async () => {
      repo.sendHoleSample.mockRejectedValueOnce(Object.assign(new Error('422'), { status: 422 }));

      await enviar();

      expect(store.mias('u1')).toEqual([]);
    });

    it('/code-review: la enviada con la barra sin género de mi color también es mía', async () => {
      await enviar({ barra: { color: 'YELLOW', gender: null } });

      expect(resumen().pendientes('u1', 'gc-1', AMARILLA)).toEqual({ 3: { tee: SALIDA, bends: [CODO], greenCenter: GREEN } });
    });

    it('de otro jugador o de otra barra no se ven', async () => {
      await enviar();

      expect(resumen().pendientes('u2', 'gc-1', AMARILLA)).toEqual({});
      expect(resumen().pendientes('u1', 'gc-1', { color: 'RED', gender: 'FEMALE' })).toEqual({});
    });
  });
});
