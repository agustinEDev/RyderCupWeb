/**
 * Un 403 CSRF ya no echa a la primera (hotfix 2.63.1, Agustín, 4 nov 2026).
 *
 * El 403 CSRF lo da el middleware ANTES de ejecutar nada, así que repetir la
 * petición es seguro. Se refresca la sesión —el refresco rota la cookie y el
 * token a la vez— y se repite UNA vez con el token nuevo. Solo si vuelve a
 * fallar se cierra la sesión, como antes.
 *
 *   #  qué pasa                                   | resultado
 *   ---|-----------------------------------------|---------------------------------
 *   11 403 CSRF y el reintento va bien           | la respuesta, sin cerrar sesión
 *   12 el reintento vuelve a dar 403 CSRF        | cierre de sesión, error marcado
 *   12b ... y el cierre lleva método, ruta y 403  | para el aviso a Sentry (FE #1042)
 *   13 el refresco da 401 (sesión muerta)        | cierre de sesión, sin reintento
 *   14 el refresco falla por la red              | «sin conexión», sin cierre
 *   15 el reintento da otro error (409)          | ese error, tal cual
 *   16 tres 403 CSRF a la vez                    | un solo refresco, cada una repite una vez
 *   17 vence el tope durante el refresco         | «sin conexión»
 *   18 un 403 que no es CSRF                     | sin reintento ni refresco
 *   19 un GET                                    | no lleva token: nada cambia
 *   23 cada reintento                            | aviso en Sentry, sin el token
 *
 * Tras el revisor:
 *   24 la cookie ya cambió (otra pestaña)        | repite SIN refrescar
 *   25 tras el refresco no hay token             | cierre de sesión, sin mandar «null»
 *   26 (dispositivo revocado: lo trata el interceptor, ver 13)
 *   27 vence el tope durante el reintento        | «sin conexión»
 *
 * Tras `/code-review`:
 *   13 el refresco da 401                         | lo trata el interceptor (aviso de
 *                                                  sesión caducada o de revocado), y el
 *                                                  error sale marcado para la cola
 *   14 el refresco falla por la red              | «sin conexión», sin cierre
 *   34 el refresco da 429 / 503                  | ese estado, con su texto; sin cierre
 *   24b sin cookie y la memoria distinta         | refresca: la memoria no dice que otra
 *                                                  pestaña haya rotado nada
 *   23c sin cookie al salir (caducó a los 15 min) | sin aviso a Sentry: es lo normal
 *   33 el refresco no cambia el token            | cierre, sin mandar el reintento
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const llamarAlBackend = vi.fn();
const refrescoCompartido = vi.fn();
const getCsrfToken = vi.fn();
const handleCsrfLogout = vi.fn();
const captureError = vi.fn();
const getCsrfCookie = vi.fn();
const trataElFalloDelRefresco = vi.fn();

// `conElTokenAlDia` es el de verdad: el reintento lo usa para poner el token
vi.mock('../utils/tokenRefreshInterceptor', async (original) => ({
  ...(await original()),
  fetchWithTokenRefresh: (...args) => llamarAlBackend(...args),
  refrescoCompartido: (...args) => refrescoCompartido(...args),
  trataElFalloDelRefresco: (...args) => trataElFalloDelRefresco(...args),
}));
vi.mock('../contexts/csrfTokenSync', () => ({
  getCsrfToken: () => getCsrfToken(),
  getCsrfCookie: () => getCsrfCookie(),
  setCsrfTokenGlobal: () => {},
}));
vi.mock('../utils/csrfLogout', () => ({ handleCsrfLogout: (...args) => handleCsrfLogout(...args) }));
vi.mock('../utils/sentryHelpers', () => ({ captureError: (...args) => captureError(...args) }));
vi.mock('i18next', () => ({ default: { t: (clave) => `t(${clave})` } }));

const { apiRequest } = await import('./api');
const { esFalloDeRedDeLaApi } = await import('../utils/sinCobertura');

const csrf403 = () => ({
  ok: false,
  status: 403,
  statusText: 'Forbidden',
  json: async () => ({ detail: 'CSRF token missing or invalid', error_code: 'CSRF_VALIDATION_FAILED' }),
});
const ok = (cuerpo = { id: 'qm1' }) => ({ ok: true, status: 200, json: async () => cuerpo });

const tokenEnviado = (llamada) => llamarAlBackend.mock.calls[llamada][1].headers['X-CSRF-Token'];

const crea = () => apiRequest('/api/v1/quick-matches/start', { method: 'POST', body: '{}' });

describe('apiRequest · 403 CSRF con un reintento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Antes del refresco, el viejo; después, el que trajo el refresco
    getCsrfToken.mockReturnValue('VIEJO');
    // Por defecto la cookie existe y es la que se manda
    getCsrfCookie.mockImplementation(() => getCsrfToken());
    refrescoCompartido.mockImplementation(async () => {
      getCsrfToken.mockReturnValue('NUEVO');
      return true;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('11: refresca, repite con el token nuevo y devuelve la respuesta sin cerrar sesión', async () => {
    llamarAlBackend.mockResolvedValueOnce(csrf403()).mockResolvedValueOnce(ok());

    await expect(crea()).resolves.toEqual({ id: 'qm1' });

    expect(refrescoCompartido).toHaveBeenCalledTimes(1);
    expect(llamarAlBackend).toHaveBeenCalledTimes(2);
    expect(tokenEnviado(0)).toBe('VIEJO');
    expect(tokenEnviado(1)).toBe('NUEVO');
    expect(handleCsrfLogout).not.toHaveBeenCalled();
  });

  it('11b: el reintento es la MISMA petición: mismo método, ruta y cuerpo', async () => {
    llamarAlBackend.mockResolvedValueOnce(csrf403()).mockResolvedValueOnce(ok());

    await crea();

    const [urlA, configA] = llamarAlBackend.mock.calls[0];
    const [urlB, configB] = llamarAlBackend.mock.calls[1];
    expect(urlB).toBe(urlA);
    expect(configB.method).toBe(configA.method);
    expect(configB.body).toBe(configA.body);
    expect(configB.credentials).toBe('include');
  });

  it('12: si el reintento vuelve a dar 403 CSRF, cierra sesión con el error marcado', async () => {
    llamarAlBackend.mockResolvedValue(csrf403());

    const error = await crea().catch((e) => e);

    expect(error.errorCode).toBe('CSRF_VALIDATION_FAILED');
    expect(handleCsrfLogout).toHaveBeenCalledTimes(1);
    expect(llamarAlBackend).toHaveBeenCalledTimes(2);
    expect(refrescoCompartido).toHaveBeenCalledTimes(1);
  });

  it('12b: el cierre lleva el método, la ruta y el 403 para el aviso a Sentry (FE #1042)', async () => {
    llamarAlBackend.mockResolvedValue(csrf403());

    await crea().catch(() => {});

    expect(handleCsrfLogout).toHaveBeenCalledWith(expect.anything(), {
      metodo: 'POST',
      endpoint: '/api/v1/quick-matches/start',
      estado: 403,
    });
  });

  it('13: si el refresco da 401, lo trata el interceptor y el error sale marcado', async () => {
    llamarAlBackend.mockResolvedValueOnce(csrf403());
    const rechazo = Object.assign(new Error('expired'), { response: { status: 401 }, errorData: { detail: 'x' } });
    refrescoCompartido.mockRejectedValue(rechazo);

    const error = await crea().catch((e) => e);

    // El aviso de sesión caducada (o de revocado) y su cierre sin duplicados
    // son del interceptor: aquí no se cierra por CSRF encima
    expect(trataElFalloDelRefresco).toHaveBeenCalledWith(rechazo);
    expect(handleCsrfLogout).not.toHaveBeenCalled();
    expect(error.errorCode).toBe('CSRF_VALIDATION_FAILED');
    expect(llamarAlBackend).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['la red', new TypeError('Load failed')],
    ['el tope propio del refresco', Object.assign(new Error('aborted'), { name: 'AbortError' })],
  ])('14: si el refresco falla por %s, «sin conexión» y SIN cerrar sesión', async (_, fallo) => {
    llamarAlBackend.mockResolvedValueOnce(csrf403());
    refrescoCompartido.mockRejectedValue(fallo);

    const error = await crea().catch((e) => e);

    expect(esFalloDeRedDeLaApi(error)).toBe(true);
    expect(handleCsrfLogout).not.toHaveBeenCalled();
    expect(llamarAlBackend).toHaveBeenCalledTimes(1);
  });

  it('15: si el reintento da otro error, sube ese tal cual', async () => {
    llamarAlBackend.mockResolvedValueOnce(csrf403()).mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ detail: 'Ya existe' }),
    });

    const error = await crea().catch((e) => e);

    expect(error.status).toBe(409);
    expect(error.message).toBe('Ya existe');
    expect(handleCsrfLogout).not.toHaveBeenCalled();
  });

  it('16: tres 403 a la vez piden el refresco compartido y cada una se repite una vez', async () => {
    // Un doble que comparte como el de verdad: quien llega con uno en vuelo
    // espera a ese. Se cuentan los refrescos que SALEN, no las llamadas (revisor)
    let enVuelo = null;
    let refrescosHechos = 0;
    refrescoCompartido.mockImplementation(() => {
      enVuelo ??= (async () => {
        refrescosHechos += 1;
        await Promise.resolve();
        getCsrfToken.mockReturnValue('NUEVO');
        return true;
      })().finally(() => {
        enVuelo = null;
      });
      return enVuelo;
    });
    llamarAlBackend.mockImplementation(async (_url, config) =>
      config.headers['X-CSRF-Token'] === 'NUEVO' ? ok() : csrf403()
    );

    const resultados = await Promise.all([crea(), crea(), crea()]);

    expect(resultados).toEqual([{ id: 'qm1' }, { id: 'qm1' }, { id: 'qm1' }]);
    expect(refrescosHechos).toBe(1);
    // Cada una sale dos veces: la rechazada y su único reintento
    expect(llamarAlBackend).toHaveBeenCalledTimes(6);
    expect(handleCsrfLogout).not.toHaveBeenCalled();
  });

  it('17: si vence el tope mientras se refresca, «sin conexión»', async () => {
    vi.useFakeTimers();
    llamarAlBackend.mockResolvedValueOnce(csrf403());
    refrescoCompartido.mockImplementation(() => new Promise(() => {}));

    const promesa = apiRequest('/api/v1/x', { method: 'POST', body: '{}', topeMs: 5000 }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(5000);
    const error = await promesa;

    expect(esFalloDeRedDeLaApi(error)).toBe(true);
    expect(handleCsrfLogout).not.toHaveBeenCalled();
  });

  it('18: un 403 que no es CSRF no refresca ni repite', async () => {
    llamarAlBackend.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ detail: 'Not allowed' }),
    });

    const error = await crea().catch((e) => e);

    expect(error.status).toBe(403);
    expect(refrescoCompartido).not.toHaveBeenCalled();
    expect(llamarAlBackend).toHaveBeenCalledTimes(1);
    expect(handleCsrfLogout).not.toHaveBeenCalled();
  });

  it('19: un GET no lleva token ni se toca', async () => {
    llamarAlBackend.mockResolvedValue(ok([]));

    await apiRequest('/api/v1/quick-matches/me');

    expect(llamarAlBackend.mock.calls[0][1].headers['X-CSRF-Token']).toBeUndefined();
    expect(refrescoCompartido).not.toHaveBeenCalled();
  });

  it('23: cada reintento deja un aviso en Sentry con método y ruta, nunca el token', async () => {
    llamarAlBackend.mockResolvedValueOnce(csrf403()).mockResolvedValueOnce(ok());

    await apiRequest('/api/v1/quick-matches/start?x=1', { method: 'POST', body: '{}' });

    expect(captureError).toHaveBeenCalledTimes(1);
    const [mensaje, contexto] = captureError.mock.calls[0];
    expect(contexto.level).toBe('warning');
    expect(contexto.extra).toMatchObject({ method: 'POST', ruta: '/api/v1/quick-matches/start' });
    expect(JSON.stringify([mensaje, contexto])).not.toMatch(/VIEJO|NUEVO/);
  });

  it('23b: sin reintento, ningún aviso', async () => {
    llamarAlBackend.mockResolvedValue(ok());

    await crea();

    expect(captureError).not.toHaveBeenCalled();
  });
  it.each([
    [429, 't(common:demasiadasPeticiones)'],
    [503, 'HTTP 503: Service Unavailable'],
  ])('34: si el refresco da %s, sale ese estado y SIN cerrar sesión', async (estado, mensaje) => {
    llamarAlBackend.mockResolvedValueOnce(csrf403());
    refrescoCompartido.mockRejectedValue(
      Object.assign(new Error('Failed to refresh token'), {
        response: { status: estado, statusText: 'Service Unavailable' },
        errorData: {},
      })
    );

    const error = await crea().catch((e) => e);

    expect(error.status).toBe(estado);
    expect(error.message).toBe(mensaje);
    expect(esFalloDeRedDeLaApi(error)).toBe(false);
    expect(handleCsrfLogout).not.toHaveBeenCalled();
    expect(trataElFalloDelRefresco).not.toHaveBeenCalled();
  });

  it('24b: sin cookie, que la memoria sea otra no dice nada: refresca', async () => {
    getCsrfCookie.mockReturnValue(null);
    llamarAlBackend.mockImplementationOnce(async () => {
      getCsrfToken.mockReturnValue('MEMORIA_VIEJA');
      return csrf403();
    }).mockResolvedValueOnce(ok());

    await crea();

    expect(refrescoCompartido).toHaveBeenCalledTimes(1);
    expect(tokenEnviado(1)).toBe('NUEVO');
  });

  it('23c: sin cookie al salir (caducó a los 15 min), ningún aviso: es lo normal', async () => {
    getCsrfCookie.mockReturnValue(null);
    llamarAlBackend.mockResolvedValueOnce(csrf403()).mockResolvedValueOnce(ok());

    await crea();

    expect(captureError).not.toHaveBeenCalled();
  });

  it('33: si el refresco no cambia el token, cierra sin mandar un reintento perdido', async () => {
    llamarAlBackend.mockResolvedValueOnce(csrf403());
    refrescoCompartido.mockResolvedValue(true);

    const error = await crea().catch((e) => e);

    expect(error.errorCode).toBe('CSRF_VALIDATION_FAILED');
    expect(handleCsrfLogout).toHaveBeenCalledTimes(1);
    expect(llamarAlBackend).toHaveBeenCalledTimes(1);
  });

  it('24: si la cookie ya cambió (otra pestaña refrescó), repite sin refrescar', async () => {
    llamarAlBackend.mockImplementationOnce(async () => {
      getCsrfToken.mockReturnValue('DE_LA_OTRA');
      return csrf403();
    }).mockResolvedValueOnce(ok());

    await expect(crea()).resolves.toEqual({ id: 'qm1' });

    expect(refrescoCompartido).not.toHaveBeenCalled();
    expect(tokenEnviado(1)).toBe('DE_LA_OTRA');
    expect(handleCsrfLogout).not.toHaveBeenCalled();
  });

  it('25: si tras el refresco no hay token, cierra sesión sin mandar la cabecera «null»', async () => {
    llamarAlBackend.mockResolvedValueOnce(csrf403());
    refrescoCompartido.mockImplementation(async () => {
      getCsrfToken.mockReturnValue(null);
      return true;
    });

    const error = await crea().catch((e) => e);

    expect(error.errorCode).toBe('CSRF_VALIDATION_FAILED');
    expect(handleCsrfLogout).toHaveBeenCalledTimes(1);
    expect(llamarAlBackend).toHaveBeenCalledTimes(1);
  });

  it('27: si vence el tope durante el reintento, «sin conexión»', async () => {
    vi.useFakeTimers();
    llamarAlBackend.mockResolvedValueOnce(csrf403()).mockImplementationOnce(() => new Promise(() => {}));

    const promesa = apiRequest('/api/v1/x', { method: 'POST', body: '{}', topeMs: 5000 }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(5000);
    const error = await promesa;

    expect(esFalloDeRedDeLaApi(error)).toBe(true);
    expect(llamarAlBackend).toHaveBeenCalledTimes(2);
    expect(handleCsrfLogout).not.toHaveBeenCalled();
  });
});
