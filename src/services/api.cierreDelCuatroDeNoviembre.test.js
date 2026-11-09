import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * El cierre del 4 nov, de punta a punta hasta Sentry (FE #1042, Agustín, 5 nov).
 *
 * Al crear una partida rápida, un 403 CSRF echó a Agustín de la app y Sentry no
 * se enteró de nada. Aquí va el mismo camino con las piezas reales —`apiRequest`,
 * `handleCsrfLogout` y el aviso— y solo Sentry y la red simulados:
 *
 *   #   qué pasa                                         | lo que llega a Sentry
 *   ----|-----------------------------------------------|------------------------------------
 *   N1  POST /quick-matches/start: 403 CSRF, refresco  | un warning «Forced logout: unrecovered
 *       bien y el reintento otra vez 403 CSRF          |   CSRF 403 / …», csrf_unrecovered,
 *                                                      |   POST /api/v1/quick-matches/start, 403
 *   N2  el mismo 403 pero el reintento va bien         | ningún aviso de cierre: no hubo cierre
 */
const sentry = vi.hoisted(() => {
  const scope = { setLevel: vi.fn(), setTag: vi.fn(), setExtra: vi.fn(), setFingerprint: vi.fn() };
  return { scope, withScope: vi.fn((fn) => fn(scope)), captureMessage: vi.fn(), captureException: vi.fn() };
});
vi.mock('@sentry/react', () => ({
  withScope: sentry.withScope,
  captureMessage: sentry.captureMessage,
  captureException: sentry.captureException,
  setUser: vi.fn(),
}));

const llamarAlBackend = vi.fn();
const refrescoCompartido = vi.fn();
const getCsrfToken = vi.fn();
vi.mock('../infrastructure/http/tokenRefreshInterceptor', async (original) => ({
  ...(await original()),
  fetchWithTokenRefresh: (...args) => llamarAlBackend(...args),
  refrescoCompartido: (...args) => refrescoCompartido(...args),
}));
vi.mock('../infrastructure/http/csrfTokenSync', () => ({
  getCsrfToken: () => getCsrfToken(),
  getCsrfCookie: () => getCsrfToken(),
  setCsrfTokenGlobal: () => {},
}));
vi.mock('../services/novedadesDeActividad', () => ({ olvidaLasNovedades: vi.fn() }));
vi.mock('i18next', () => ({ default: { t: (clave) => clave } }));

// Lo que se borra de la cuenta lo registra la composition root, como en la app:
// sin él, `handleCsrfLogout` se tragaba el «no hay limpiezas registradas»
await import('../composition/limpiezaAlCerrarLaSesion');
const { olvidaLasNovedades } = await import('./novedadesDeActividad');
const { apiRequest } = await import('./api');

const csrf403 = () => ({
  ok: false,
  status: 403,
  statusText: 'Forbidden',
  json: async () => ({ detail: 'CSRF token missing or invalid', error_code: 'CSRF_VALIDATION_FAILED' }),
});

const crearLaPartida = () => apiRequest('/api/v1/quick-matches/start', { method: 'POST', body: '{}' });

const avisosDeCierre = () =>
  sentry.captureMessage.mock.calls.filter(([titulo]) => String(titulo).startsWith('Forced logout'));

describe('el cierre del 4 nov llega a Sentry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    delete window.location;
    window.location = { href: '', pathname: '/quick-match/new' };
    getCsrfToken.mockReturnValue('VIEJO');
    refrescoCompartido.mockImplementation(async () => {
      getCsrfToken.mockReturnValue('NUEVO');
      return true;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('N1: el 403 CSRF que no se recupera manda un aviso con la ruta de crear la partida', async () => {
    llamarAlBackend.mockResolvedValue(csrf403());

    await crearLaPartida().catch(() => {});

    expect(window.location.href).toBe('/login');
    expect(avisosDeCierre()).toEqual([
      ['Forced logout: unrecovered CSRF 403 / Cierre de sesión forzado: 403 CSRF sin recuperar', 'warning'],
    ]);
    expect(Object.fromEntries(sentry.scope.setTag.mock.calls)).toMatchObject({
      'logout.reason': 'csrf_unrecovered',
      'logout.route': 'POST /api/v1/quick-matches/start',
      'logout.status': '403',
    });
    // Y la cuenta se limpió entera: sin el registro, el fallo se quedaba en la consola
    expect(olvidaLasNovedades).toHaveBeenCalledTimes(1);
    expect(console.error).not.toHaveBeenCalledWith('[CSRF] Logout cleanup failed:', expect.anything());
  });

  it('N2: si el reintento va bien, no hay cierre ni aviso de cierre', async () => {
    llamarAlBackend
      .mockResolvedValueOnce(csrf403())
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: 'qm1' }) });

    await expect(crearLaPartida()).resolves.toEqual({ id: 'qm1' });

    expect(avisosDeCierre()).toEqual([]);
  });
});
