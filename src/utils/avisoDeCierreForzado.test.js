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
    ['/api/v1/golf-courses/abc/hole-map/samples/7#frag', '/api/v1/golf-courses/abc/hole-map/samples/{id}'],
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

  it('A12: no manda nada más que el título y las tres etiquetas', async () => {
    const { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } = await cargar();

    avisaDelCierreForzado({
      motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO,
      metodo: 'POST',
      endpoint: '/api/v1/auth/refresh-token',
      estado: 401,
      errorData: { detail: 'ana@example.com' },
    });

    expect(sentry.scope.setTag).toHaveBeenCalledTimes(3);
    expect(JSON.stringify(sentry.captureMessage.mock.calls)).not.toContain('ana@example.com');
    expect(JSON.stringify(sentry.scope.setTag.mock.calls)).not.toContain('ana@example.com');
  });
});
