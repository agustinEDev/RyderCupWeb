import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Los dos avisos que salen de la red, no de un cierre explícito (FE #1042, revisor 5 nov).
 *
 *   #   caso                                                    | aviso
 *   ----|------------------------------------------------------|-----------------------------
 *   R1  el refresco va bien y la petición repetida da 401 otra vez | session_lost, con su ruta
 *   R2  el refresco va bien y la repetida va bien               | ninguno
 *   S1  la sonda: el refresco da 401 con un código raro         | refresh_rejected, con el código
 *   S2  la sonda: el refresco da 401 normal (sin cookie…)       | ninguno: es cada visitante anónimo
 */
const aviso = vi.hoisted(() => ({ avisaDelCierreForzado: vi.fn() }));
vi.mock('./avisoDeCierreForzado', async (original) => ({
  ...(await original()),
  avisaDelCierreForzado: aviso.avisaDelCierreForzado,
}));
vi.mock('./deviceRevocationLogout', () => ({
  isDeviceRevoked: vi.fn(() => false),
  isSessionExpired: vi.fn(() => false),
  handleDeviceRevocationLogout: vi.fn(),
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
      .mockResolvedValueOnce(respuesta(401, { detail: 'x' }))
      .mockResolvedValueOnce(respuesta(200, { csrf_token: 't' }))
      .mockResolvedValueOnce(respuesta(401, { detail: 'x' }));

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
});
