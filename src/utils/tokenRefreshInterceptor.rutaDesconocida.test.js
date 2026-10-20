import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * N2 (FE #544): un visitante sin sesión que abre una dirección que no existe ve
 * la página de «no existe», no la salida a `/login` con «tu sesión expiró».
 * Antes, el 401 de `/current-user` disparaba el refresco, fallaba y echaba.
 */
const salidas = vi.hoisted(() => ({ expirada: vi.fn() }));

vi.mock('./deviceRevocationLogout', () => ({
  isDeviceRevoked: () => false,
  isSessionExpired: () => true,
  handleDeviceRevocationLogout: vi.fn(),
  handleSessionExpiredLogout: salidas.expirada,
  requiresReAuthentication: () => false,
  clearDeviceRevocationFlag: vi.fn(),
}));

const { fetchWithTokenRefresh } = await import('./tokenRefreshInterceptor');

const noAutorizado = () =>
  new globalThis.Response(JSON.stringify({ detail: 'Refresh token expired' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

describe('interceptor · dirección que no existe', () => {
  let guardado;

  beforeEach(() => {
    guardado = null;
    salidas.expirada.mockClear();
    vi.stubGlobal('localStorage', {
      getItem: (k) => (k === 'user' ? guardado : null),
      setItem: () => {},
      removeItem: () => {},
    });
    vi.stubGlobal('fetch', vi.fn(async () => noAutorizado()));
    window.history.pushState({}, '', '/esto-no-existe');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('N2: sin usuario guardado, el 401 vuelve tal cual, sin refresco ni salida', async () => {
    const respuesta = await fetchWithTokenRefresh('/api/v1/auth/current-user', {});

    expect(respuesta.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls.some(([url]) => url.includes('refresh-token'))).toBe(false);
    expect(salidas.expirada).not.toHaveBeenCalled();
  });

  it('con usuario guardado sí intenta refrescar: puede tener la sesión viva', async () => {
    guardado = JSON.stringify({ id: 'u-1' });

    await fetchWithTokenRefresh('/api/v1/auth/current-user', {}).catch(() => {});

    expect(fetch.mock.calls.some(([url]) => url.includes('refresh-token'))).toBe(true);
  });
});
