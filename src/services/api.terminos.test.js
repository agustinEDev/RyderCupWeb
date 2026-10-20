import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * F4: un 403 `TERMS_NOT_ACCEPTED` de cualquier llamada lleva a la pantalla de
 * aceptar los Términos en vez de un error genérico, UNA sola vez.
 *
 *   dónde está el usuario           | qué pasa
 *   --------------------------------|-----------------------------------------------
 *   una ruta protegida              | redirige a /accept-terms?from=…, sin toast: la promesa no se resuelve
 *   varias llamadas fallan a la vez | una sola redirección
 *   /accept-terms o completar perfil| no redirige (sería un bucle): error marcado
 *   una ruta pública (/terms…)      | no redirige: se puede leer lo que se acepta
 *   otro 403                        | el error de siempre, sin redirigir
 */
vi.mock('../contexts/csrfTokenSync', () => ({ getCsrfToken: vi.fn(() => 'csrf') }));
vi.mock('../utils/tokenRefreshInterceptor', () => ({ fetchWithTokenRefresh: vi.fn() }));

const { fetchWithTokenRefresh } = await import('../utils/tokenRefreshInterceptor');
const { apiRequest } = await import('./api');
const { olvidaLaRedireccionATerminos } = await import('../utils/terminosPendientes');

const respuesta403 = (error_code) => ({
  ok: false,
  status: 403,
  statusText: 'Forbidden',
  json: async () => ({ detail: 'Terms not accepted', error_code }),
});

const enUna = (pathname, search = '') => {
  const assign = vi.fn();
  vi.stubGlobal('location', { pathname, search, assign });
  return assign;
};

// Lo que no se resuelve en este tiempo, no se resuelve: la página se va
const noSeResuelve = async (promesa) =>
  Promise.race([promesa.then(() => 'resuelta', () => 'rechazada'), new Promise((r) => setTimeout(() => r('colgada'), 50))]);

describe('apiRequest · Términos sin aceptar (F4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    olvidaLaRedireccionATerminos();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('en una ruta protegida: a la pantalla de aceptar, recordando dónde estaba, sin error que enseñar', async () => {
    const assign = enUna('/competitions/7', '?tab=agenda');
    fetchWithTokenRefresh.mockResolvedValue(respuesta403('TERMS_NOT_ACCEPTED'));

    const estado = await noSeResuelve(apiRequest('/api/v1/competitions/7'));

    expect(estado).toBe('colgada');
    expect(assign).toHaveBeenCalledWith('/accept-terms?from=%2Fcompetitions%2F7%3Ftab%3Dagenda');
  });

  it('varias llamadas a la vez: una sola redirección', async () => {
    const assign = enUna('/dashboard');
    fetchWithTokenRefresh.mockResolvedValue(respuesta403('TERMS_NOT_ACCEPTED'));

    await Promise.all([
      noSeResuelve(apiRequest('/api/v1/a')),
      noSeResuelve(apiRequest('/api/v1/b')),
      noSeResuelve(apiRequest('/api/v1/c')),
    ]);

    expect(assign).toHaveBeenCalledTimes(1);
  });

  it.each([['/accept-terms'], ['/auth/complete-profile'], ['/terms'], ['/privacy'], ['/legal'], ['/']])(
    'en %s no redirige: lanza el error marcado',
    async (ruta) => {
      const assign = enUna(ruta);
      fetchWithTokenRefresh.mockResolvedValue(respuesta403('TERMS_NOT_ACCEPTED'));

      const error = await apiRequest('/api/v1/users/me/devices').catch((e) => e);

      expect(assign).not.toHaveBeenCalled();
      expect(error).toMatchObject({ status: 403, errorCode: 'TERMS_NOT_ACCEPTED' });
    }
  );

  it('otro 403: el error de siempre, sin redirigir', async () => {
    const assign = enUna('/dashboard');
    fetchWithTokenRefresh.mockResolvedValue(respuesta403('NOT_THE_CREATOR'));

    const error = await apiRequest('/api/v1/x').catch((e) => e);

    expect(assign).not.toHaveBeenCalled();
    expect(error).toMatchObject({ status: 403, errorCode: 'NOT_THE_CREATOR' });
  });
});
