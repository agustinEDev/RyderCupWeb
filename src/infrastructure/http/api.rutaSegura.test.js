import { describe, it, expect, beforeEach, vi } from 'vitest';
// Como en la app: la respuesta de la interfaz al transporte, registrada antes de nada
import '../../composition/interfazDelTransporte';

/**
 * El guardián central de `apiRequest` (FE-03, C3): ninguna petición sale con una ruta
 * que el navegador resolvería en otra (`..`, `%2e%2e`), hacia otro servidor (`//`,
 * `https://`) o fuera de la API. No sale, se avisa a Sentry sin la ruta (puede llevar
 * ids) y quien llamó recibe el error. Hasta la 2.74.0, una ruta que empezaba por
 * `http` se pedía tal cual, con las cookies y el token CSRF.
 */
const llamarAlBackend = vi.fn();
vi.mock('./tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: (...args) => llamarAlBackend(...args),
}));
vi.mock('./csrfTokenSync', () => ({ getCsrfCookie: () => 'csrf', getCsrfToken: () => 'csrf' }));
vi.mock('i18next', () => ({ default: { t: (clave) => `t(${clave})` } }));
const informado = vi.hoisted(() => []);
vi.mock('../../utils/sentryHelpers', async (original) => ({
  ...(await original()),
  captureError: vi.fn((error, contexto) => informado.push([error, contexto])),
}));

const { apiRequest } = await import('./api');
const { RutaDeLaApiNoValida } = await import('./rutaDeLaApi');

const ok = () => ({ ok: true, status: 200, headers: new globalThis.Headers({ 'content-type': 'application/json' }), json: async () => ({}), clone() { return this; } });

describe('apiRequest · ruta segura (FE-03, C3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    informado.length = 0;
    llamarAlBackend.mockResolvedValue(ok());
  });

  it.each([
    ['con «..»', '/api/v1/competitions/../admin/users', 'DELETE'],
    ['con «%2e%2e»', '/api/v1/competitions/%2e%2e/rounds/r-1/envelope', 'POST'],
    ['hacia otro servidor', 'https://evil.example/api/v1/x', 'POST'],
    ['protocolo relativo', '//evil.example/api/v1/x', 'GET'],
    ['fuera de la API', '/admin', 'GET'],
  ])('%s: no sale, avisa a Sentry sin la ruta y lanza', async (_caso, ruta, method) => {
    await expect(apiRequest(ruta, { method })).rejects.toBeInstanceOf(RutaDeLaApiNoValida);

    expect(llamarAlBackend).not.toHaveBeenCalled();
    expect(informado).toHaveLength(1);
    const [, contexto] = informado[0];
    expect(contexto.level).toBe('warning');
    expect(JSON.stringify(informado[0])).not.toContain('evil');
    expect(JSON.stringify(informado[0])).not.toContain('admin');
  });

  it('una ruta normal de la API sale como siempre', async () => {
    await apiRequest('/api/v1/competitions/0b5a6c1e-2d3f-4a5b-8c7d-9e0f1a2b3c4d?status=ACTIVE');

    expect(llamarAlBackend).toHaveBeenCalledTimes(1);
    expect(informado).toHaveLength(0);
  });

  it('el mensaje del error va traducido, como los demás del transporte', async () => {
    const error = await apiRequest('/api/v1/competitions/../admin').catch((e) => e);

    expect(error).toBeInstanceOf(RutaDeLaApiNoValida);
    expect(error.message).toBe('t(common:errors.generic)');
  });
});
