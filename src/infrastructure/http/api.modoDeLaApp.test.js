import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * La app instalada manda X-App-Mode en sus peticiones y en el refresco (FE #1046).
 *
 *   M4  una petición de la app instalada  | lleva X-App-Mode: standalone
 *   M5  el refresco de la app instalada   | también
 *   M6  desde el navegador                | ninguna la lleva
 */
const instalada = vi.hoisted(() => ({ valor: true }));
vi.mock('../../utils/standalone', () => ({ detectStandalone: () => instalada.valor }));

const ok = () => ({ ok: true, status: 200, json: async () => ({ csrf_token: 't' }), headers: new globalThis.Headers(), clone() { return ok(); } });

describe('X-App-Mode en las peticiones', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn(async () => ok()));
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  });

  it('M4: una petición de la app instalada lleva X-App-Mode', async () => {
    instalada.valor = true;
    const { apiRequest } = await import('./api');

    await apiRequest('/api/v1/users/me/devices');

    const cabeceras = globalThis.fetch.mock.calls[0][1].headers;
    expect(cabeceras['X-App-Mode']).toBe('standalone');
  });

  it('M5: el refresco de la app instalada también', async () => {
    instalada.valor = true;
    const { refreshAccessToken } = await import('./tokenRefreshInterceptor');

    await refreshAccessToken().catch(() => {});

    const llamada = globalThis.fetch.mock.calls.find(([url]) => String(url).includes('/auth/refresh-token'));
    expect(llamada[1].headers['X-App-Mode']).toBe('standalone');
  });

  it('M6: desde el navegador no se manda', async () => {
    instalada.valor = false;
    const { apiRequest } = await import('./api');

    await apiRequest('/api/v1/users/me/devices');

    expect(globalThis.fetch.mock.calls[0][1].headers['X-App-Mode']).toBeUndefined();
  });
});
