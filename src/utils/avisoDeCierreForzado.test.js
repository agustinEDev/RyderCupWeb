import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Cada cierre de sesión que hace la app sola llega a Sentry (FE #1042).
 *
 * El 4 nov un 403 CSRF echaba a la gente y Sentry no lo vio: el backend solo
 * informa de los 5xx y el front no informaba de sus cierres de sesión. Ahora cada
 * uno es un `warning` con título en inglés y castellano, etiquetas en inglés para
 * filtrar, y agrupado por motivo, no por ruta.
 *
 *   #   caso                                       | esperado
 *   ----|-------------------------------------------|-------------------------------
 *   A1  refresco rechazado                         | warning «Forced logout: refresh rejected /
 *                                                  |   Cierre de sesión forzado: refresco rechazado»
 *   A2  dispositivo revocado                       | motivo device_revoked, su título
 *   A3  403 CSRF tras el reintento                 | motivo csrf_unrecovered, su título
 *   A4  la sesión caducó como debe                 | motivo session_expired: aparte, se puede silenciar
 *   A5  etiquetas                                  | logout.reason, logout.route, logout.status
 *   A6  agrupación                                 | por motivo: ['forced-logout', motivo]
 *   A7  ruta con ids, query, origen                | POST /api/v1/quick-matches/{id}/start
 *   A8  sin ruta ni estado                         | 'unknown' y 'none', no se omiten
 *   A9  Sentry lanza                               | no sube: el cierre sigue
 *   A10 el mismo motivo dos veces en la página     | un solo aviso
 *   A11 un motivo que no existe                    | no se manda nada
 *   A12 nada de datos personales                   | ni el cuerpo del error ni extras
 *
 * Tras el revisor (5 nov):
 *   A13 el error_code del refresco                 | normal (MISSING, EXPIRED, IDLE) →
 *                                                  |   session_expired; el resto → refresh_rejected
 *   A14 sesión perdida tras refrescar bien          | session_lost, su título
 *   A15 el usuario pidió cerrar la sesión           | nada durante 30 s; después, sí
 *   A16 un endpoint que no se deja leer             | no lanza
 *   A17 el código del backend                      | etiqueta logout.code ('none' sin él)
 */
const sentry = vi.hoisted(() => {
  const scope = { setLevel: vi.fn(), setTag: vi.fn(), setFingerprint: vi.fn() };
  return {
    scope,
    withScope: vi.fn((fn) => fn(scope)),
    captureMessage: vi.fn(),
  };
});
vi.mock('@sentry/react', () => ({
  withScope: sentry.withScope,
  captureMessage: sentry.captureMessage,
}));

const cargar = async () => {
  vi.resetModules();
  return import('./avisoDeCierreForzado');
};

const etiquetas = () => Object.fromEntries(sentry.scope.setTag.mock.calls);

describe('avisaDelCierreForzado · lo que llega a Sentry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sentry.withScope.mockImplementation((fn) => fn(sentry.scope));
  });

  it('A1: el refresco rechazado manda un warning con el título en los dos idiomas', async () => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();

    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO });

    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
    expect(sentry.captureMessage).toHaveBeenCalledWith(
      'Forced logout: refresh rejected / Cierre de sesión forzado: refresco rechazado',
      'warning'
    );
    expect(sentry.scope.setLevel).toHaveBeenCalledWith('warning');
  });

  it.each([
    ['DISPOSITIVO_REVOCADO', 'device_revoked', 'Forced logout: device revoked / Cierre de sesión forzado: dispositivo revocado'],
    ['CSRF_SIN_RECUPERAR', 'csrf_unrecovered', 'Forced logout: unrecovered CSRF 403 / Cierre de sesión forzado: 403 CSRF sin recuperar'],
    ['SESION_CADUCADA', 'session_expired', 'Forced logout: session expired / Cierre de sesión forzado: sesión caducada'],
  ])('A2-A4: %s va con el motivo %s y su título', async (clave, motivo, titulo) => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();

    expect(MOTIVO_DEL_CIERRE[clave]).toBe(motivo);
    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE[clave] });

    expect(sentry.captureMessage).toHaveBeenCalledWith(titulo, 'warning');
    expect(etiquetas()['logout.reason']).toBe(motivo);
  });

  it('A5: lleva el motivo, la ruta y el estado como etiquetas', async () => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();

    avisaDelCierreForzado({
      motivo: MOTIVO_DEL_CIERRE.CSRF_SIN_RECUPERAR,
      metodo: 'post',
      endpoint: '/api/v1/quick-matches/start',
      estado: 403,
    });

    expect(etiquetas()).toEqual({
      'logout.reason': 'csrf_unrecovered',
      'logout.route': 'POST /api/v1/quick-matches/start',
      'logout.status': '403',
      'logout.code': 'none',
    });
  });

  it('A6: se agrupa por motivo, no por ruta', async () => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();

    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.DISPOSITIVO_REVOCADO, endpoint: '/api/v1/a' });

    expect(sentry.scope.setFingerprint).toHaveBeenCalledWith(['forced-logout', 'device_revoked']);
  });

  it.each([
    ['/api/v1/quick-matches/3f2a1c9e-1b2d-4c3e-8f9a-0b1c2d3e4f5a/start', '/api/v1/quick-matches/{id}/start'],
    ['https://api.rydercupfriends.com/api/v1/auth/refresh-token', '/api/v1/auth/refresh-token'],
    ['/api/v1/matches/42/status?token=secreto&x=1', '/api/v1/matches/{id}/status'],
    ['/api/v1/golf-courses/abc/hole-map/samples/7#frag', '/api/v1/golf-courses/{id}/hole-map/samples/{id}'],
    ['/api/v1/golf-courses/idenminusculas/hole-map/samples', '/api/v1/golf-courses/{id}/hole-map/samples'],
    ['/api/v1/auth/validate-reset-token/AbC-x_9zQ', '/api/v1/auth/validate-reset-token/{id}'],
    ['/api/v1/auth/current-user#token=AbC', '/api/v1/auth/current-user'],
    ['/api/v1/auth/verify-email/abcdefghijklmnopqrstuvwxyzabcdefghij', '/api/v1/auth/verify-email/{id}'],
  ])('A7: la ruta %s sale como %s', async (endpoint, esperada) => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();

    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.CSRF_SIN_RECUPERAR, metodo: 'POST', endpoint });

    expect(etiquetas()['logout.route']).toBe(`POST ${esperada}`);
  });

  it('A8: sin ruta ni estado dice «unknown» y «none», no los omite', async () => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();

    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.DISPOSITIVO_REVOCADO });

    expect(etiquetas()).toEqual({
      'logout.reason': 'device_revoked',
      'logout.route': 'unknown',
      'logout.status': 'none',
      'logout.code': 'none',
    });
  });

  it('A9: si Sentry lanza, no sube: quien cierra la sesión sigue', async () => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();
    sentry.withScope.mockImplementation(() => {
      throw new Error('Sentry no cargado');
    });

    expect(() => avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO })).not.toThrow();
  });

  it('A10: el mismo motivo dos veces en la misma página es un solo aviso; otro motivo, sí', async () => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();

    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.CSRF_SIN_RECUPERAR });
    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.CSRF_SIN_RECUPERAR });
    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.DISPOSITIVO_REVOCADO });

    expect(sentry.captureMessage).toHaveBeenCalledTimes(2);
  });

  it('A11: un motivo que no existe no manda nada', async () => {
    const { avisaDelCierreForzado } = await cargar();

    avisaDelCierreForzado({ motivo: 'otra-cosa' });

    expect(sentry.captureMessage).not.toHaveBeenCalled();
  });

  it('A12: no manda nada más que el título y las cuatro etiquetas', async () => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();

    avisaDelCierreForzado({
      motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO,
      metodo: 'POST',
      endpoint: '/api/v1/auth/refresh-token',
      estado: 401,
      errorData: { detail: 'ana@example.com' },
    });

    expect(sentry.scope.setTag).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(sentry.captureMessage.mock.calls)).not.toContain('ana@example.com');
    expect(JSON.stringify(sentry.scope.setTag.mock.calls)).not.toContain('ana@example.com');
  });

  it.each([
    ['REFRESH_TOKEN_MISSING', 'session_expired'],
    ['REFRESH_TOKEN_EXPIRED', 'session_expired'],
    ['SESSION_IDLE', 'session_expired'],
    ['REFRESH_TOKEN_REVOKED', 'refresh_rejected'],
    ['REFRESH_TOKEN_INVALID', 'refresh_rejected'],
    ['REFRESH_TOKEN_NOT_FOUND', 'refresh_rejected'],
    ['USER_NOT_FOUND', 'refresh_rejected'],
    [undefined, 'refresh_rejected'],
  ])('A13: el refresco rechazado con %s es %s', async (codigo, motivo) => {
    const { motivoDelRefrescoRechazado } = await cargar();

    expect(motivoDelRefrescoRechazado({ detail: 'x', error_code: codigo })).toBe(motivo);
  });

  it('A13b: sin cuerpo, es un rechazo', async () => {
    const { motivoDelRefrescoRechazado } = await cargar();

    expect(motivoDelRefrescoRechazado(undefined)).toBe('refresh_rejected');
  });

  it('A14: la sesión perdida tras refrescar bien tiene su motivo y su título', async () => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();

    expect(MOTIVO_DEL_CIERRE.SESION_PERDIDA).toBe('session_lost');
    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.SESION_PERDIDA });

    expect(sentry.captureMessage).toHaveBeenCalledWith(
      'Forced logout: session lost after a good refresh / Cierre de sesión forzado: sesión perdida tras refrescar bien',
      'warning'
    );
  });

  it('A15: si el usuario pidió cerrar la sesión, nada durante 30 s; después vuelve a avisar', async () => {
    const { avisaDelCierreForzado, noAvisesDeCierres, MOTIVO_DEL_CIERRE } = await cargar();
    const ahora = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

    noAvisesDeCierres();
    ahora.mockReturnValue(1_000_000 + 29_000);
    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO });
    expect(sentry.captureMessage).not.toHaveBeenCalled();

    ahora.mockReturnValue(1_000_000 + 31_000);
    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO });
    expect(sentry.captureMessage).toHaveBeenCalledTimes(1);
    ahora.mockRestore();
  });

  it('A15b: el silencio sobrevive a recargar la página (useLogout recarga al salir)', async () => {
    const guardado = new Map();
    vi.stubGlobal('sessionStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
    const primera = await cargar();
    primera.noAvisesDeCierres();

    const trasRecargar = await cargar();
    trasRecargar.avisaDelCierreForzado({ motivo: trasRecargar.MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO });

    expect(sentry.captureMessage).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('A15c: si sessionStorage lanza, el silencio sigue en memoria y nada se rompe', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    });
    const { avisaDelCierreForzado, noAvisesDeCierres, MOTIVO_DEL_CIERRE } = await cargar();

    expect(() => noAvisesDeCierres()).not.toThrow();
    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO });

    expect(sentry.captureMessage).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('A16: un endpoint que lanza al leerlo no hace lanzar al aviso', async () => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();
    const raro = {
      toString() {
        throw new Error('no');
      },
    };

    expect(() => avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.CSRF_SIN_RECUPERAR, endpoint: raro })).not.toThrow();
  });

  it('A17: lleva el código del backend en logout.code', async () => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();

    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO, codigo: 'REFRESH_TOKEN_REVOKED' });

    expect(etiquetas()['logout.code']).toBe('REFRESH_TOKEN_REVOKED');
  });

  it.each([
    [{ tags: { 'logout.reason': 'session_expired' } }, false],
    [{ tags: { 'logout.reason': 'refresh_rejected' } }, true],
    [{ tags: { 'logout.reason': 'csrf_unrecovered' } }, true],
    [{ tags: {} }, true],
    [{}, true],
  ])('A18: la grabación de Replay, para %j: %s', async (evento, graba) => {
    const { grabaSoloLoQueNoEsNormal } = await cargar();

    expect(grabaSoloLoQueNoEsNormal(evento)).toBe(graba);
  });

  it('A19: todos los tramos fijos de las rutas del front están en la lista; si no, saldrían como {id}', async () => {
    const fuentes = import.meta.glob(['../**/*.{js,jsx,ts}', '!../**/*.test.*'], {
      query: '?raw',
      import: 'default',
      eager: true,
    });
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();
    const tramos = new Set();
    for (const codigo of Object.values(fuentes)) {
      for (const [, ruta] of codigo.matchAll(/['`"](\/api\/v1\/[^'`"?]*)/g)) {
        ruta
          .replace(/\$\{[^}]*\}/g, '{x}')
          .split('/')
          .filter((t) => t && !/[{}$<>]/.test(t))
          .forEach((t) => tramos.add(t));
      }
    }

    expect(tramos.size).toBeGreaterThan(50);
    for (const tramo of tramos) {
      sentry.scope.setTag.mockClear();
      vi.resetModules();
      const modulo = await cargar();
      modulo.avisaDelCierreForzado({ motivo: modulo.MOTIVO_DEL_CIERRE.CSRF_SIN_RECUPERAR, metodo: 'GET', endpoint: `/${tramo}` });
      expect(etiquetas()['logout.route'], tramo).toBe(`GET /${tramo}`);
    }
    expect(avisaDelCierreForzado).toBeTypeOf('function');
    expect(MOTIVO_DEL_CIERRE).toBeDefined();
  });
});
