import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Cada camino que cierra la sesión por su cuenta avisa, con su motivo y su ruta
 * (FE #1042). El aviso en sí está en `avisoDeCierreForzado.test.js`; aquí, quién
 * lo dispara y con qué.
 *
 *   #   camino                                          | aviso
 *   ----|------------------------------------------------|-----------------------------
 *   C1  handleDeviceRevocationLogout(datos, contexto)   | device_revoked, con su contexto
 *   C1b ... con otro motivo en el contexto              | sigue siendo device_revoked
 *   C2  handleSessionExpiredLogout(datos)               | session_expired
 *   C3  ... con contexto.motivo = refresh_rejected      | refresh_rejected
 *   C4  ya tratado antes en esta página                 | ninguno (sin duplicados)
 *   C5  handleCsrfLogout(datos, contexto)               | csrf_unrecovered, con su contexto
 *   C6  el refresco: dispositivo revocado               | revocado, ruta y estado del refresco
 *   C7  el refresco: 401 con un código normal            | session_expired, con su código
 *       (MISSING, EXPIRED, IDLE)                        |
 *   C8  el refresco: 401 con un código raro (REVOKED…)  | refresh_rejected, con su código
 *   C8b el refresco: 401 sin código                     | refresh_rejected
 *   C9  el refresco: 5xx o sin red                      | ninguno: la sesión se conserva
 *   C10 cerrar sesión a petición del usuario            | useLogout calla los avisos antes de salir
 */
const aviso = vi.hoisted(() => ({ avisaDelCierreForzado: vi.fn() }));
vi.mock('./avisoDeCierreForzado', async (original) => ({
  ...(await original()),
  avisaDelCierreForzado: aviso.avisaDelCierreForzado,
}));
vi.mock('../services/novedadesDeActividad', () => ({ olvidaLasNovedades: vi.fn() }));
vi.mock('./sentryHelpers', () => ({ clearUserContext: vi.fn() }));
vi.mock('i18next', () => ({ default: { t: vi.fn((k) => k) } }));
vi.mock('./toast', () => ({ default: { error: vi.fn() } }));

const { handleDeviceRevocationLogout, handleSessionExpiredLogout, olvidaElCierreDeEstaCarga } = await import(
  './deviceRevocationLogout'
);
const { handleCsrfLogout } = await import('./csrfLogout');
const { trataElFalloDelRefresco } = await import('./tokenRefreshInterceptor');
const { MOTIVO_DEL_CIERRE } = await import('./avisoDeCierreForzado');

const REFRESCO = 'https://api.rydercupfriends.com/api/v1/auth/refresh-token';

const falloDelRefresco = (status, detail, error_code) =>
  Object.assign(new Error('refresh failed'), {
    response: { status, url: REFRESCO },
    errorData: detail ? { detail, ...(error_code ? { error_code } : {}) } : undefined,
  });

describe('quién avisa de un cierre de sesión forzado', () => {
  let guardado;

  beforeEach(() => {
    vi.clearAllMocks();
    // Cada test, una carga de página nueva (C1)
    olvidaElCierreDeEstaCarga();
    guardado = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
      setItem: (k, v) => guardado.set(k, String(v)),
      removeItem: (k) => guardado.delete(k),
    });
    delete window.location;
    window.location = { href: '', pathname: '/dashboard' };
  });

  it('C1: el dispositivo revocado avisa con su motivo y el contexto que le pasan', () => {
    handleDeviceRevocationLogout({ detail: 'Dispositivo revocado' }, { metodo: 'GET', endpoint: '/api/v1/x', estado: 401 });

    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith({
      motivo: MOTIVO_DEL_CIERRE.DISPOSITIVO_REVOCADO,
      metodo: 'GET',
      endpoint: '/api/v1/x',
      estado: 401,
    });
  });

  it('C1b: un revocado es siempre device_revoked, aunque el contexto traiga otro motivo', () => {
    handleDeviceRevocationLogout(null, { motivo: MOTIVO_DEL_CIERRE.SESION_CADUCADA });

    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: MOTIVO_DEL_CIERRE.DISPOSITIVO_REVOCADO })
    );
  });

  it('C2: la sesión caducada avisa como session_expired', () => {
    handleSessionExpiredLogout({ detail: 'Refresh token inválido o expirado' });

    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: MOTIVO_DEL_CIERRE.SESION_CADUCADA })
    );
  });

  it('C3: con otro motivo en el contexto, avisa con ese', () => {
    handleSessionExpiredLogout(null, { motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO, estado: 401 });

    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO, estado: 401 })
    );
  });

  it('C4: si ya se trató en esta página, no vuelve a avisar', () => {
    handleDeviceRevocationLogout();
    handleDeviceRevocationLogout();
    handleSessionExpiredLogout();

    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledTimes(1);
  });

  it('C1c: avisa a Sentry ANTES de quitarle el usuario: el evento dice de quién es', async () => {
    const { clearUserContext } = await import('./sentryHelpers');

    handleSessionExpiredLogout({ detail: 'Refresh token inválido o expirado' });

    expect(aviso.avisaDelCierreForzado).toHaveBeenCalled();
    expect(aviso.avisaDelCierreForzado.mock.invocationCallOrder[0]).toBeLessThan(
      clearUserContext.mock.invocationCallOrder[0]
    );
  });

  it('C4b: tras revocar el propio dispositivo (marca «propia»), no avisa: salió a propósito', () => {
    guardado.set('device_revocation_handled', 'propia');

    handleDeviceRevocationLogout({ detail: 'Dispositivo revocado' });

    expect(aviso.avisaDelCierreForzado).not.toHaveBeenCalled();
  });

  it('C5: el cierre por CSRF avisa como csrf_unrecovered con su ruta', () => {
    handleCsrfLogout({ detail: 'x' }, { metodo: 'POST', endpoint: '/api/v1/quick-matches/start', estado: 403 });

    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith({
      motivo: MOTIVO_DEL_CIERRE.CSRF_SIN_RECUPERAR,
      metodo: 'POST',
      endpoint: '/api/v1/quick-matches/start',
      estado: 403,
    });
  });

  it('C6: el refresco que dice «revocado» avisa con la ruta y el estado del refresco', () => {
    trataElFalloDelRefresco(falloDelRefresco(401, 'Dispositivo revocado. Por favor, inicia sesión nuevamente.'));

    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith({
      motivo: MOTIVO_DEL_CIERRE.DISPOSITIVO_REVOCADO,
      metodo: 'POST',
      endpoint: REFRESCO,
      estado: 401,
    });
  });

  it.each([
    ['Refresh token no proporcionado. Por favor, inicia sesión nuevamente.', 'REFRESH_TOKEN_MISSING'],
    ['Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.', 'REFRESH_TOKEN_EXPIRED'],
    ['Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.', 'SESSION_IDLE'],
  ])('C7: el refresco con «%s» y %s avisa como session_expired', (detail, codigo) => {
    trataElFalloDelRefresco(falloDelRefresco(401, detail, codigo));

    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith(
      expect.objectContaining({
        motivo: MOTIVO_DEL_CIERRE.SESION_CADUCADA,
        endpoint: REFRESCO,
        estado: 401,
        codigo,
      })
    );
  });

  it.each(['REFRESH_TOKEN_REVOKED', 'REFRESH_TOKEN_INVALID', 'REFRESH_TOKEN_NOT_FOUND', 'USER_NOT_FOUND'])(
    'C8: el refresco con el código %s avisa como refresh_rejected',
    (codigo) => {
      trataElFalloDelRefresco(
        falloDelRefresco(401, 'Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.', codigo)
      );

      expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith(
        expect.objectContaining({ motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO, codigo })
      );
    }
  );

  it('C8b: un 401 del refresco sin código avisa como refresh_rejected', () => {
    trataElFalloDelRefresco(falloDelRefresco(401, 'Usuario no encontrado'));

    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO, endpoint: REFRESCO, estado: 401 })
    );
  });

  it.each([
    ['un 503', falloDelRefresco(503, 'down')],
    ['sin red', new TypeError('Failed to fetch')],
  ])('C9: el refresco con %s no cierra ni avisa', (_, error) => {
    trataElFalloDelRefresco(error);

    expect(aviso.avisaDelCierreForzado).not.toHaveBeenCalled();
  });

  it('C10: el cierre de sesión que pide el usuario calla los avisos antes de llamar al backend', async () => {
    const fuente = (await import('../hooks/useLogout.js?raw')).default;

    // Su POST /auth/logout puede pasar por el interceptor y un refresco que ya
    // no vale: eso no es un cierre forzado (revisor, 5 nov)
    expect(fuente).toMatch(/noAvisesDeCierres\(\)/);
    expect(fuente.indexOf('noAvisesDeCierres()')).toBeLessThan(fuente.indexOf('logoutUseCase.execute'));
  });
});
