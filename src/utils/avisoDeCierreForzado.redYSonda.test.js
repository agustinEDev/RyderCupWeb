import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Los dos avisos que salen de la red, no de un cierre explícito (FE #1042, revisor 5 nov).
 *
 *   #   caso                                                    | aviso
 *   ----|------------------------------------------------------|-----------------------------
 *   R1  el refresco va bien y la repetida da 401 de token         | session_lost, con su ruta
 *   R2  el refresco va bien y la repetida va bien               | ninguno
 *   R3  la repetida da 401 que no es de token (contraseña mala) | ninguno (/code-review, 5 nov)
 *   R4  la repetida dice «dispositivo revocado»                 | se trata como revocación
 *   R5  dos peticiones a la vez: una refresca y la otra espera  | las dos avisan si siguen en 401
 *   S3  la sonda: refresco bien y current-user vuelve con 401   | session_lost
 *   S4  la sonda: current-user dice «dispositivo revocado»      | device_revoked
 *   S1  la sonda: el refresco da 401 con un código raro         | refresh_rejected, con el código
 *   S2  la sonda: el refresco da 401 normal (sin cookie…)       | ninguno: es cada visitante anónimo
 */
const aviso = vi.hoisted(() => ({ avisaDelCierreForzado: vi.fn() }));
vi.mock('./avisoDeCierreForzado', async (original) => ({
  ...(await original()),
  avisaDelCierreForzado: aviso.avisaDelCierreForzado,
}));
const revocacion = vi.hoisted(() => ({ handleDeviceRevocationLogout: vi.fn() }));
vi.mock('./deviceRevocationLogout', async (original) => ({
  isDeviceRevoked: (await original()).isDeviceRevoked,
  isSessionExpired: vi.fn(() => false),
  handleDeviceRevocationLogout: revocacion.handleDeviceRevocationLogout,
  handleSessionExpiredLogout: vi.fn(),
}));

const respuesta = (status, cuerpo = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  url: '',
  headers: new globalThis.Headers(),
  json: async () => cuerpo,
  clone() {
    return respuesta(status, cuerpo);
  },
});

const { fetchWithTokenRefresh } = await import('./tokenRefreshInterceptor');
const { preguntaLaSesionSinInterceptor } = await import('../services/sondaDeSesion');
const { MOTIVO_DEL_CIERRE } = await import('./avisoDeCierreForzado');

describe('avisos que salen de la red', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    globalThis.location = { pathname: '/dashboard', href: '' };
  });

  it('R1: si tras refrescar bien la petición vuelve a dar 401, avisa de sesión perdida', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(respuesta(401, { detail: 'Token inválido o expirado' }))
      .mockResolvedValueOnce(respuesta(200, { csrf_token: 't' }))
      .mockResolvedValueOnce(respuesta(401, { detail: 'Token inválido o expirado' }));

    const final = await fetchWithTokenRefresh('/api/v1/quick-matches/me', { method: 'GET' });

    expect(final.status).toBe(401);
    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith({
      motivo: MOTIVO_DEL_CIERRE.SESION_PERDIDA,
      metodo: 'GET',
      endpoint: '/api/v1/quick-matches/me',
      estado: 401,
    });
  });

  it('R2: si tras refrescar la petición va bien, no avisa', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(respuesta(401, { detail: 'x' }))
      .mockResolvedValueOnce(respuesta(200, { csrf_token: 't' }))
      .mockResolvedValueOnce(respuesta(200, {}));

    await fetchWithTokenRefresh('/api/v1/quick-matches/me', { method: 'GET' });

    expect(aviso.avisaDelCierreForzado).not.toHaveBeenCalled();
  });

  it('S1: la sonda avisa si el refresco se rechaza por algo raro', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(respuesta(401, { detail: 'Not authenticated' }))
      .mockResolvedValueOnce(respuesta(401, { detail: 'inválido o expirado', error_code: 'REFRESH_TOKEN_REVOKED' }));

    const resultado = await preguntaLaSesionSinInterceptor();

    expect(resultado.estado).toBe('rechazada');
    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith(
      expect.objectContaining({
        motivo: MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO,
        codigo: 'REFRESH_TOKEN_REVOKED',
        estado: 401,
      })
    );
  });

  it.each(['REFRESH_TOKEN_MISSING', 'REFRESH_TOKEN_EXPIRED', 'SESSION_IDLE'])(
    'S2: la sonda no avisa si el refresco se rechaza con %s',
    async (codigo) => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce(respuesta(401, { detail: 'Not authenticated' }))
        .mockResolvedValueOnce(respuesta(401, { detail: 'x', error_code: codigo }));

      await preguntaLaSesionSinInterceptor();

      expect(aviso.avisaDelCierreForzado).not.toHaveBeenCalled();
    }
  );

  it('R3: si la repetida da un 401 que no es de token, no avisa', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(respuesta(401, { detail: 'Token inválido o expirado' }))
      .mockResolvedValueOnce(respuesta(200, { csrf_token: 't' }))
      .mockResolvedValueOnce(respuesta(401, { detail: 'La contraseña actual no es correcta' }));

    await fetchWithTokenRefresh('/api/v1/users/me/security', { method: 'PATCH' });

    expect(aviso.avisaDelCierreForzado).not.toHaveBeenCalled();
  });

  it('R4: si la repetida dice «dispositivo revocado», se trata como revocación', async () => {
    const revocado = { detail: 'Dispositivo revocado. Por favor, inicia sesión nuevamente.' };
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(respuesta(401, { detail: 'Token inválido o expirado' }))
      .mockResolvedValueOnce(respuesta(200, { csrf_token: 't' }))
      .mockResolvedValueOnce(respuesta(401, revocado));

    await fetchWithTokenRefresh('/api/v1/quick-matches/me', { method: 'GET' }).catch(() => {});

    expect(revocacion.handleDeviceRevocationLogout).toHaveBeenCalledWith(revocado, {
      metodo: 'GET',
      endpoint: '/api/v1/quick-matches/me',
      estado: 401,
    });
    expect(aviso.avisaDelCierreForzado).not.toHaveBeenCalledWith(
      expect.objectContaining({ motivo: MOTIVO_DEL_CIERRE.SESION_PERDIDA })
    );
  });

  it('R5: la petición que espera al refresco de otra también avisa si sigue en 401', async () => {
    let soltarElRefresco;
    globalThis.fetch = vi.fn((url) => {
      if (String(url).includes('/auth/refresh-token')) {
        return new Promise((resolver) => {
          soltarElRefresco = () => resolver(respuesta(200, { csrf_token: 't' }));
        });
      }
      return Promise.resolve(respuesta(401, { detail: 'Token inválido o expirado' }));
    });

    const una = fetchWithTokenRefresh('/api/v1/a', { method: 'GET' });
    const otra = fetchWithTokenRefresh('/api/v1/b', { method: 'GET' });
    await vi.waitFor(() => expect(soltarElRefresco).toBeTypeOf('function'));
    soltarElRefresco();
    await Promise.all([una, otra]);

    const perdidas = aviso.avisaDelCierreForzado.mock.calls.filter(
      ([a]) => a.motivo === MOTIVO_DEL_CIERRE.SESION_PERDIDA
    );
    expect(perdidas.map(([a]) => a.endpoint).sort()).toEqual(['/api/v1/a', '/api/v1/b']);
  });

  it('S3: la sonda avisa si tras refrescar bien current-user vuelve con 401 de token', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(respuesta(401, { detail: 'Token inválido o expirado' }))
      .mockResolvedValueOnce(respuesta(200, { csrf_token: 't' }))
      .mockResolvedValueOnce(respuesta(401, { detail: 'Credenciales de autenticación no proporcionadas' }));

    const resultado = await preguntaLaSesionSinInterceptor();

    expect(resultado.estado).toBe('rechazada');
    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: MOTIVO_DEL_CIERRE.SESION_PERDIDA, estado: 401 })
    );
  });

  it('S4: la sonda avisa si current-user dice «dispositivo revocado»', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(respuesta(401, { detail: 'Dispositivo revocado. Por favor, inicia sesión nuevamente.' }));

    const resultado = await preguntaLaSesionSinInterceptor();

    expect(resultado.estado).toBe('revocada');
    expect(aviso.avisaDelCierreForzado).toHaveBeenCalledWith(
      expect.objectContaining({ motivo: MOTIVO_DEL_CIERRE.DISPOSITIVO_REVOCADO, estado: 401 })
    );
  });
});
