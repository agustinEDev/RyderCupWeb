import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SendHoleReportUseCase from './SendHoleReportUseCase';
import SendPendingHoleReportsUseCase from './SendPendingHoleReportsUseCase';
import LocalStorageHoleReportStore from '../../../infrastructure/repositories/LocalStorageHoleReportStore';

/**
 * Los reportes de un hoyo (entrega 7, 18 oct 2026): el motivo y la línea que
 * propone el jugador. Como las muestras, a la cola del móvil antes de nada y se
 * envían cuando haya cobertura (R5); lo que el servidor no quiere es un fallo
 * nuestro y va a Sentry. Al jugador solo se le da las gracias, al enviarlo.
 *
 * | Caso | Qué                                                  | Qué se espera                                           |
 * |------|------------------------------------------------------|---------------------------------------------------------|
 * | D1   | enviar con red                                       | a la cola ANTES de pedir; al llegar, fuera              |
 * | D2   | sin jugador o sin campo                              | nada                                                    |
 * | D3   | sin id                                               | nada, y a Sentry (es un fallo del mapa)                 |
 * | D4   | 404 / 422 (rechazo definitivo)                       | fuera de la cola, a Sentry con su código                |
 * | D5   | sin red, 5xx, 429, 401                               | se queda en la cola, para la tanda, sin Sentry          |
 * | D6   | el mismo reporte (mismo id) otra vez                 | sustituye al de la cola; uno solo                       |
 * | D7   | dos reportes de hoyos distintos                      | los dos en la cola, en su orden                         |
 * | D8   | vaciar la cola                                       | solo la de quien tiene la sesión, en orden              |
 * | D9   | sin red a mitad                                      | se para ahí; lo demás sigue en la cola                  |
 * | D10  | un rechazo definitivo a mitad                        | se descarta y sigue con los demás                       |
 * | D11  | `sigue()` deja de ser cierto                         | lo que queda no sale                                    |
 * | D12  | la tanda encuentra uno que ya se está enviando       | no lo manda dos veces                                   |
 * | D13  | localStorage roto o lleno                            | la cola sigue en memoria; lo ilegible no cuenta         |
 * | D14  | sin salida o sin green (un fallo nuestro)            | ni a la cola ni al servidor, y a Sentry; en la cola, no cuenta |
 */

const SALIDA = { lat: 36.28, lon: -5.33 };
const CODO = { lat: 36.2815, lon: -5.331 };
const GREEN = { lat: 36.2827, lon: -5.33 };
const AHORA = '2026-10-18T08:05:00.000Z';

const sinRed = () => Object.assign(new TypeError('sin conexión'), { cause: new TypeError('Failed to fetch') });
const http = (status, errorCode = null) => Object.assign(new Error(`HTTP ${status}`), { status, errorCode });

describe('reportes de hoyo — casos de uso', () => {
  let guardado;
  let store;
  let repo;
  let reportarFallo;
  let enVuelo;

  const reporte = (extra = {}) => ({
    userId: 'yo',
    golfCourseId: 'gc-1',
    holeNumber: 3,
    id: 'r-1',
    reason: 'WRONG_LINE',
    tee: SALIDA,
    bends: [CODO],
    greenCenter: GREEN,
    ...extra,
  });
  const enviar = (extra) =>
    new SendHoleReportUseCase({ golfCourseRepository: repo, holeReportStore: store, reportarFallo, enVuelo, ahora: () => AHORA }).execute(reporte(extra));
  const vaciar = (userId = 'yo', opciones) =>
    new SendPendingHoleReportsUseCase({ golfCourseRepository: repo, holeReportStore: store, reportarFallo, enVuelo }).execute(userId, opciones);

  beforeEach(() => {
    guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
    store = new LocalStorageHoleReportStore();
    repo = { sendHoleReport: vi.fn(async () => undefined) };
    reportarFallo = vi.fn();
    enVuelo = new Set();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('D1: va a la cola antes de pedir y, al llegar, sale de ella', async () => {
    let enLaColaAlPedir = null;
    repo.sendHoleReport.mockImplementation(async () => {
      enLaColaAlPedir = store.cola('yo').length;
    });

    const { estado } = await enviar();

    expect(estado).toBe('enviado');
    expect(enLaColaAlPedir).toBe(1);
    expect(repo.sendHoleReport).toHaveBeenCalledWith('gc-1', 3, { id: 'r-1', reason: 'WRONG_LINE', tee: SALIDA, bends: [CODO], greenCenter: GREEN });
    expect(store.cola('yo')).toEqual([]);
    expect(reportarFallo).not.toHaveBeenCalled();
  });

  it.each([
    ['sin jugador', { userId: null }],
    ['sin campo', { golfCourseId: null }],
  ])('D2: %s, nada', async (_caso, extra) => {
    const { estado } = await enviar(extra);

    expect(estado).toBe('ignorado');
    expect(repo.sendHoleReport).not.toHaveBeenCalled();
    expect(store.cola('yo')).toEqual([]);
  });

  it('D3: sin id, nada y a Sentry', async () => {
    const { estado } = await enviar({ id: null });

    expect(estado).toBe('ignorado');
    expect(repo.sendHoleReport).not.toHaveBeenCalled();
    expect(reportarFallo).toHaveBeenCalledTimes(1);
  });

  it.each([
    [404, 'GOLF_COURSE_NOT_FOUND'],
    [422, 'HOLE_NOT_IN_COURSE'],
  ])('D4: un %i (%s) lo saca de la cola y va a Sentry', async (status, errorCode) => {
    repo.sendHoleReport.mockRejectedValue(http(status, errorCode));

    const { estado } = await enviar();

    expect(estado).toBe('descartado');
    expect(store.cola('yo')).toEqual([]);
    expect(reportarFallo).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ status, errorCode, holeNumber: 3 }));
  });

  it.each([
    ['sin red', sinRed()],
    ['un 503', http(503)],
    ['un 429', http(429)],
    ['un 401', http(401)],
  ])('D5: %s, se queda en la cola y para la tanda, sin Sentry', async (_caso, error) => {
    repo.sendHoleReport.mockRejectedValue(error);

    const resultado = await enviar();

    expect(resultado).toEqual({ estado: 'pendiente', paraLaTanda: true });
    expect(store.cola('yo')).toHaveLength(1);
    expect(store.cola('yo')[0]).toMatchObject({ id: 'r-1', golfCourseId: 'gc-1', holeNumber: 3, reason: 'WRONG_LINE', enCola: AHORA });
    expect(reportarFallo).not.toHaveBeenCalled();
  });

  it('D6: el mismo reporte otra vez sustituye al de la cola', async () => {
    repo.sendHoleReport.mockRejectedValue(sinRed());

    await enviar();
    await enviar({ reason: 'HOLE_CHANGED' });

    expect(store.cola('yo')).toHaveLength(1);
    expect(store.cola('yo')[0].reason).toBe('HOLE_CHANGED');
  });

  it('D7: dos reportes de hoyos distintos esperan los dos, en su orden', async () => {
    repo.sendHoleReport.mockRejectedValue(sinRed());

    await enviar();
    await enviar({ id: 'r-2', holeNumber: 7 });

    expect(store.cola('yo').map((r) => r.id)).toEqual(['r-1', 'r-2']);
  });

  it('D8: vaciar manda solo los de quien tiene la sesión, en orden', async () => {
    repo.sendHoleReport.mockRejectedValue(sinRed());
    await enviar();
    await enviar({ id: 'r-2', holeNumber: 7 });
    await enviar({ id: 'r-otro', userId: 'otro' });
    repo.sendHoleReport.mockReset().mockResolvedValue(undefined);

    const cuenta = await vaciar('yo');

    expect(cuenta).toEqual({ enviados: 2, descartados: 0, pendientes: 0 });
    expect(repo.sendHoleReport.mock.calls.map((c) => c[2].id)).toEqual(['r-1', 'r-2']);
    expect(store.cola('yo')).toEqual([]);
    expect(store.cola('otro')).toHaveLength(1);
  });

  it('D9: sin red a mitad, se para ahí y lo demás sigue en la cola', async () => {
    repo.sendHoleReport.mockRejectedValue(sinRed());
    await enviar();
    await enviar({ id: 'r-2', holeNumber: 7 });
    await enviar({ id: 'r-3', holeNumber: 8 });
    repo.sendHoleReport.mockReset().mockResolvedValueOnce(undefined).mockRejectedValueOnce(sinRed());

    const cuenta = await vaciar('yo');

    expect(cuenta).toEqual({ enviados: 1, descartados: 0, pendientes: 2 });
    expect(repo.sendHoleReport).toHaveBeenCalledTimes(2);
    expect(store.cola('yo').map((r) => r.id)).toEqual(['r-2', 'r-3']);
  });

  it('D10: un rechazo definitivo a mitad se descarta y sigue con los demás', async () => {
    repo.sendHoleReport.mockRejectedValue(sinRed());
    await enviar();
    await enviar({ id: 'r-2', holeNumber: 7 });
    repo.sendHoleReport.mockReset().mockRejectedValueOnce(http(422, 'HOLE_NOT_IN_COURSE')).mockResolvedValueOnce(undefined);

    const cuenta = await vaciar('yo');

    expect(cuenta).toEqual({ enviados: 1, descartados: 1, pendientes: 0 });
    expect(store.cola('yo')).toEqual([]);
  });

  it('D11: si `sigue()` deja de ser cierto, lo que queda no sale', async () => {
    repo.sendHoleReport.mockRejectedValue(sinRed());
    await enviar();
    await enviar({ id: 'r-2', holeNumber: 7 });
    repo.sendHoleReport.mockReset().mockResolvedValue(undefined);
    let vivo = true;
    repo.sendHoleReport.mockImplementation(async () => {
      vivo = false;
    });

    const cuenta = await vaciar('yo', { sigue: () => vivo });

    expect(cuenta).toEqual({ enviados: 1, descartados: 0, pendientes: 1 });
    expect(store.cola('yo').map((r) => r.id)).toEqual(['r-2']);
  });

  it('D12: la tanda no manda otra vez el que ya va de camino', async () => {
    let suelta;
    repo.sendHoleReport.mockImplementation(() => new Promise((ok) => (suelta = ok)));
    const primero = enviar();

    const cuenta = await vaciar('yo');
    suelta();
    await primero;

    expect(repo.sendHoleReport).toHaveBeenCalledTimes(1);
    expect(cuenta).toEqual({ enviados: 0, descartados: 0, pendientes: 0 });
  });

  it.each([
    ['sin salida', { tee: null }],
    ['sin green', { greenCenter: undefined }],
    ['con un codo roto', { bends: [null] }],
    ['con los codos que no son una lista', { bends: 'x' }],
  ])('D14: %s, nada y a Sentry', async (_caso, extra) => {
    const { estado } = await enviar(extra);

    expect(estado).toBe('ignorado');
    expect(store.cola('yo')).toEqual([]);
    expect(repo.sendHoleReport).not.toHaveBeenCalled();
    expect(reportarFallo).toHaveBeenCalledTimes(1);
  });

  it('D14: una entrada de la cola sin salida no cuenta (no atasca las demás)', async () => {
    guardado.set('reportesDeHoyosPendientes:v1:yo', JSON.stringify([{ id: 'r-0', golfCourseId: 'gc-1', holeNumber: 3, reason: 'WRONG_LINE', tee: null, greenCenter: GREEN, enCola: AHORA }]));

    expect(store.cola('yo')).toEqual([]);
  });

  it.each([
    ['un codo roto', [null]],
    ['un codo sin lon', [{ lat: 42.3 }]],
    ['codos que no son una lista', 'x'],
  ])('D14: una entrada de la cola con %s no cuenta (CodeRabbit)', async (_caso, bends) => {
    guardado.set('reportesDeHoyosPendientes:v1:yo', JSON.stringify([{ id: 'r-0', golfCourseId: 'gc-1', holeNumber: 3, reason: 'WRONG_LINE', tee: GREEN, bends, greenCenter: GREEN, enCola: AHORA }]));

    expect(store.cola('yo')).toEqual([]);
  });

  it('D14: una entrada de la cola sin codos sí cuenta', async () => {
    guardado.set('reportesDeHoyosPendientes:v1:yo', JSON.stringify([{ id: 'r-0', golfCourseId: 'gc-1', holeNumber: 3, reason: 'WRONG_LINE', tee: GREEN, greenCenter: GREEN, enCola: AHORA }]));

    expect(store.cola('yo')).toHaveLength(1);
  });

  it('D13: con localStorage lleno la cola sigue en memoria; lo ilegible no cuenta', async () => {
    guardado.set('reportesDeHoyosPendientes:v1:yo', '{roto');
    expect(store.cola('yo')).toEqual([]);
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    });
    repo.sendHoleReport.mockRejectedValue(sinRed());

    await enviar();

    expect(store.cola('yo')).toHaveLength(1);
  });
});
