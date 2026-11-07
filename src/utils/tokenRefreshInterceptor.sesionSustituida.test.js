/**
 * Un 401 `SESSION_REPLACED` del refresco (BE #734): el navegador ya tiene una sesión
 * más nueva y el servidor NO ha borrado la cookie. No es un «no» a la sesión: se
 * espera 500 ms a que llegue la cookie nueva y se reintenta UNA vez.
 *
 *   #    primer refresco     | reintento           | resultado
 *   -----|--------------------|---------------------|------------------------------
 *   S1   200                 | no hay              | sigue
 *   S2   SESSION_ENDED       | no hay              | cierre, session_expired
 *   S3   SESSION_REJECTED    | no hay              | cierre, refresh_rejected
 *   S3b  sin código          | no hay              | cierre, refresh_rejected
 *   S4   500                 | no hay              | conserva la sesión
 *   S4b  sin red             | no hay              | conserva la sesión
 *   S5   REPLACED            | no antes de 500 ms  | a los 500 ms, un segundo POST
 *   S5b  REPLACED            | 200                 | sigue, sin cierre; token CSRF nuevo
 *   S6   REPLACED            | SESSION_ENDED       | cierre, session_expired
 *   S7   REPLACED            | SESSION_REJECTED    | cierre, refresh_rejected
 *   S8   REPLACED            | 500                 | conserva la sesión
 *   S8b  REPLACED            | sin red             | conserva la sesión
 *   S9   REPLACED            | REPLACED            | SIN tercer POST, conserva la sesión
 *   S10  tres peticiones con 401 a la vez          | una tanda de POST, cada una repite
 *   S11  cada llamador con el caso S5b y S9        | sigue / no cierra (interceptor,
 *        (S11a interceptor, S11b sonda,            |   sonda = fallo, apiRequest =
 *        S11c apiRequest, S11d CSRF)               |   sin cobertura, también CSRF)
 *   S13  el tope de 15 s es por intento            | el reintento tiene los suyos
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const cierre = vi.hoisted(() => ({
  handleSessionExpiredLogout: vi.fn(),
  handleDeviceRevocationLogout: vi.fn(),
}));
vi.mock('./deviceRevocationLogout', async (original) => ({ ...(await original()), ...cierre }));

const REPLACED = { detail: 'Refresh token inválido o expirado.', error_code: 'SESSION_REPLACED' };
const ENDED = { detail: 'Refresh token inválido o expirado.', error_code: 'SESSION_ENDED' };
const REJECTED = { detail: 'Refresh token inválido o expirado.', error_code: 'SESSION_REJECTED' };

const respuesta = (status, cuerpo = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  url: 'https://api.test/api/v1/auth/refresh-token',
  headers: new globalThis.Headers({ 'content-type': 'application/json' }),
  json: async () => cuerpo,
  clone() {
    return respuesta(status, cuerpo);
  },
});
const OK = () => respuesta(200, { csrf_token: 'NUEVO' });
const r401 = (cuerpo) => () => respuesta(401, cuerpo);
const r500 = () => respuesta(500);
const sinRed = () => {
  throw new TypeError('Failed to fetch');
};

const esRefresco = (url) => String(url).includes('/auth/refresh-token');
const posts = () => globalThis.fetch.mock.calls.filter(([url]) => esRefresco(url)).length;
const peticiones = () => globalThis.fetch.mock.calls.filter(([url]) => !esRefresco(url)).length;

/** El guion del refresco, en orden; las demás peticiones dan 401 hasta que uno vaya bien. */
const conRefrescos = (...guion) => {
  let refrescado = false;
  const pendientes = [...guion];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (!esRefresco(url)) {
        return refrescado ? respuesta(200, { id: 'u1' }) : respuesta(401, { detail: 'Token inválido o expirado' });
      }
      const paso = pendientes.shift();
      if (!paso) throw new Error('Un POST al refresco de más');
      const contestacion = paso();
      if (contestacion.ok) refrescado = true;
      return contestacion;
    })
  );
};

/** Corre los 500 ms de la espera y lo que haya detrás, sin que un rechazo quede suelto. */
const hastaElFinal = async (promesa) => {
  const resultado = promesa.then(
    (valor) => ({ valor }),
    (error) => ({ error })
  );
  await vi.advanceTimersByTimeAsync(600);
  return resultado;
};

describe('SESSION_REPLACED: se reintenta una vez y no se cierra la sesión', () => {
  let interceptor;
  let setCsrfTokenGlobal;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    cierre.handleSessionExpiredLogout.mockClear();
    cierre.handleDeviceRevocationLogout.mockClear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    interceptor = await import('./tokenRefreshInterceptor');
    ({ setCsrfTokenGlobal } = await import('../contexts/csrfTokenSync'));
    vi.spyOn(document, 'cookie', 'get').mockReturnValue('');
    setCsrfTokenGlobal('VIEJO');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const pide = () => interceptor.fetchWithTokenRefresh('/api/v1/users/me', { method: 'GET', headers: {} });

  /** Refresca y trata el fallo como el interceptor: lo que queda es qué se hizo con la sesión. */
  const refrescaYTrata = async () => {
    const { error } = await hastaElFinal(interceptor.refrescoCompartido());
    if (error) interceptor.trataElFalloDelRefresco(error);
    return error;
  };

  describe('sin SESSION_REPLACED, nada cambia y no hay reintento', () => {
    it('S1: 200, un POST', async () => {
      conRefrescos(OK);
      const { error, valor } = await hastaElFinal(interceptor.refrescoCompartido());
      expect(error).toBeUndefined();
      expect(valor).toBe(true);
      expect(posts()).toBe(1);
    });

    it.each([
      ['S2', ENDED, 'session_expired'],
      ['S3', REJECTED, 'refresh_rejected'],
      ['S3b', { detail: 'otro' }, 'refresh_rejected'],
    ])('%s: un 401 definitivo cierra, sin reintento', async (_caso, cuerpo, motivo) => {
      conRefrescos(r401(cuerpo));
      await refrescaYTrata();
      expect(posts()).toBe(1);
      expect(cierre.handleSessionExpiredLogout).toHaveBeenCalledTimes(1);
      expect(cierre.handleSessionExpiredLogout.mock.calls[0][1].motivo).toBe(motivo);
    });

    it.each([
      ['S4', r500],
      ['S4b', sinRed],
    ])('%s: sin un «no» del servidor se conserva, sin reintento', async (_caso, paso) => {
      conRefrescos(paso);
      await refrescaYTrata();
      expect(posts()).toBe(1);
      expect(cierre.handleSessionExpiredLogout).not.toHaveBeenCalled();
    });
  });

  describe('con SESSION_REPLACED', () => {
    it('S5: espera 500 ms antes del segundo POST', async () => {
      conRefrescos(r401(REPLACED), OK);
      const enCurso = interceptor.refrescoCompartido();
      await vi.advanceTimersByTimeAsync(499);
      expect(posts()).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(posts()).toBe(2);
      await expect(enCurso).resolves.toBe(true);
    });

    it('S5b: el reintento va bien y se sigue, con el token CSRF nuevo y sin cierre', async () => {
      conRefrescos(r401(REPLACED), OK);
      const { error, valor } = await hastaElFinal(pide());
      expect(error).toBeUndefined();
      expect(valor.status).toBe(200);
      expect(posts()).toBe(2);
      expect(peticiones()).toBe(2);
      expect(interceptor.getLastRefreshAt()).not.toBeNull();
      const { getCsrfToken } = await import('../contexts/csrfTokenSync');
      expect(getCsrfToken()).toBe('NUEVO');
      expect(cierre.handleSessionExpiredLogout).not.toHaveBeenCalled();
    });

    it.each([
      ['S6', ENDED, 'session_expired'],
      ['S7', REJECTED, 'refresh_rejected'],
    ])('%s: el reintento da un 401 definitivo y se cierra con su motivo', async (_caso, cuerpo, motivo) => {
      conRefrescos(r401(REPLACED), r401(cuerpo));
      await refrescaYTrata();
      expect(posts()).toBe(2);
      expect(cierre.handleSessionExpiredLogout).toHaveBeenCalledTimes(1);
      expect(cierre.handleSessionExpiredLogout.mock.calls[0][1].motivo).toBe(motivo);
    });

    it.each([
      ['S8', r500],
      ['S8b', sinRed],
    ])('%s: el reintento no obtiene un «no» y se conserva', async (_caso, paso) => {
      conRefrescos(r401(REPLACED), paso);
      await refrescaYTrata();
      expect(posts()).toBe(2);
      expect(cierre.handleSessionExpiredLogout).not.toHaveBeenCalled();
    });

    it('S9: dos REPLACED: sin tercer POST, sin cierre y con el error de sin respuesta', async () => {
      conRefrescos(r401(REPLACED), r401(REPLACED));
      const error = await refrescaYTrata();
      await vi.advanceTimersByTimeAsync(2000);
      expect(posts()).toBe(2);
      expect(cierre.handleSessionExpiredLogout).not.toHaveBeenCalled();
      expect(error).toBeInstanceOf(TypeError);
      expect(error.response).toBeUndefined();
    });

    it('S10: tres peticiones a la vez comparten los dos POST y cada una repite', async () => {
      conRefrescos(r401(REPLACED), OK);
      const { valor } = await hastaElFinal(Promise.all([pide(), pide(), pide()]));
      expect(valor.map((r) => r.status)).toEqual([200, 200, 200]);
      expect(posts()).toBe(2);
      expect(peticiones()).toBe(6);
    });

    it('S13: el tope de 15 s es por intento: el reintento tiene los suyos', async () => {
      let abortado = false;
      let intentos = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn((_url, { signal }) => {
          intentos += 1;
          if (intentos === 1) {
            return new Promise((resolve) => setTimeout(() => resolve(respuesta(401, REPLACED)), 14000));
          }
          return new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => {
              abortado = true;
              reject(new globalThis.DOMException('Aborted', 'AbortError'));
            });
          });
        })
      );
      const enCurso = interceptor.refrescoCompartido().catch((error) => error);
      await vi.advanceTimersByTimeAsync(14000 + 500);
      expect(intentos).toBe(2);
      await vi.advanceTimersByTimeAsync(14999);
      expect(abortado).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(abortado).toBe(true);
      await enCurso;
    });
  });

  describe('S11: cada llamador', () => {
    it('S11a: interceptor con S9: sube el error y no cierra', async () => {
      conRefrescos(r401(REPLACED), r401(REPLACED));
      const { error } = await hastaElFinal(pide());
      expect(error).toBeInstanceOf(TypeError);
      expect(cierre.handleSessionExpiredLogout).not.toHaveBeenCalled();
    });

    it('S11b: la sonda sigue con S5b y da «fallo», no «rechazada», con S9', async () => {
      const { preguntaLaSesionSinInterceptor } = await import('../services/sondaDeSesion');
      conRefrescos(r401(REPLACED), OK);
      const bien = await hastaElFinal(preguntaLaSesionSinInterceptor());
      expect(bien.valor.estado).toBe('ok');

      conRefrescos(r401(REPLACED), r401(REPLACED));
      const mal = await hastaElFinal(preguntaLaSesionSinInterceptor());
      expect(mal.valor.estado).toBe('fallo');
    });

    it('S11c: apiRequest sigue con S5b y da falta de cobertura con S9', async () => {
      const { default: apiRequest } = await import('../services/api');
      conRefrescos(r401(REPLACED), OK);
      const bien = await hastaElFinal(apiRequest('/api/v1/users/me'));
      expect(bien.error).toBeUndefined();

      conRefrescos(r401(REPLACED), r401(REPLACED));
      const mal = await hastaElFinal(apiRequest('/api/v1/users/me'));
      expect(mal.error?.sinConexion).toBe(true);
      expect(cierre.handleSessionExpiredLogout).not.toHaveBeenCalled();
    });

    it('S11d: el reintento tras un 403 CSRF da falta de cobertura con S9, sin cierre', async () => {
      const { default: apiRequest } = await import('../services/api');
      conRefrescos(r401(REPLACED), r401(REPLACED));
      const fetchDelRefresco = globalThis.fetch;
      vi.stubGlobal(
        'fetch',
        vi.fn((url, opciones) =>
          esRefresco(url)
            ? fetchDelRefresco(url, opciones)
            : Promise.resolve(respuesta(403, { error_code: 'CSRF_VALIDATION_FAILED', detail: 'CSRF' }))
        )
      );
      const { error } = await hastaElFinal(apiRequest('/api/v1/users/me', { method: 'POST', body: '{}' }));
      expect(error?.sinConexion).toBe(true);
      expect(cierre.handleSessionExpiredLogout).not.toHaveBeenCalled();
    });
  });
});
