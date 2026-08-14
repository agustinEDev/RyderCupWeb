/**
 * Tests de la URL base de la API en useAuth (FE #392)
 *
 * `useAuth` era el ultimo sitio que resolvia la URL solo con la variable de
 * compilacion. En produccion (sitio estatico) da igual, porque nadie inyecta
 * `APP_CONFIG`; en un despliegue en contenedor `entrypoint.sh` si la inyecta y
 * el hook se quedaba apuntando al host horneado en el build mientras el resto
 * de la aplicacion seguia al inyectado.
 *
 * La URL se calcula al importar el modulo, asi que cada caso resetea los
 * modulos y vuelve a importar con el `APP_CONFIG` que toca.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const fetchWithTokenRefresh = vi.fn();

vi.mock('../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: (...args) => fetchWithTokenRefresh(...args),
}));

vi.mock('../utils/deviceRevocationLogout', () => ({
  isDeviceRevoked: vi.fn(() => false),
  handleDeviceRevocationLogout: vi.fn(),
  clearDeviceRevocationFlag: vi.fn(),
}));

const loadGetUserData = async () => {
  vi.resetModules();
  const module = await import('./useAuth');
  return module.getUserData;
};

const okResponse = () => ({
  ok: true,
  status: 200,
  json: async () => ({ id: 'user-1' }),
});

describe('useAuth - resolucion de la URL base de la API', () => {
  beforeEach(() => {
    fetchWithTokenRefresh.mockReset();
    fetchWithTokenRefresh.mockResolvedValue(okResponse());
  });

  afterEach(() => {
    delete globalThis.APP_CONFIG;
  });

  it('usa la configuracion inyectada en tiempo de ejecucion cuando existe', async () => {
    globalThis.APP_CONFIG = { API_BASE_URL: 'https://api.example.test' };

    const getUserData = await loadGetUserData();
    await getUserData();

    expect(fetchWithTokenRefresh).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/auth/current-user',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('cae en la variable de compilacion cuando no hay APP_CONFIG', async () => {
    const getUserData = await loadGetUserData();
    await getUserData();

    const [url] = fetchWithTokenRefresh.mock.calls[0];
    expect(url).toBe(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/auth/current-user`);
  });

  it('ignora un APP_CONFIG sin API_BASE_URL', async () => {
    globalThis.APP_CONFIG = {};

    const getUserData = await loadGetUserData();
    await getUserData();

    const [url] = fetchWithTokenRefresh.mock.calls[0];
    expect(url).toBe(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/auth/current-user`);
  });
});
