import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * F4: un 403 `TERMS_NOT_ACCEPTED` de cualquier llamada lleva a la pantalla de
 * aceptar los Términos en vez de un error genérico, UNA sola vez.
 *
 *   caso                                              | qué pasa
 *   --------------------------------------------------|------------------------------------------
 *   una ruta protegida                                | redirige a /accept-terms?from=…, y la llamada FALLA con un error marcado (no se queda colgada)
 *   varias llamadas fallan a la vez                   | una sola redirección
 *   la misma ruta vuelve a dar 403 tras la recarga    | no redirige otra vez: sin bucle (revisión, punto 1)
 *   pasado el plazo sin que la página se descargue    | se puede volver a redirigir
 *   sessionStorage no se deja usar                    | redirige igual, sin romper
 *   /accept-terms, completar perfil, dispositivos     | no redirige
 *   una ruta pública (/terms…)                        | no redirige: se puede leer lo que se acepta
 *   otro 403                                          | el error de siempre
 */
vi.mock('../contexts/csrfTokenSync', () => ({ getCsrfToken: vi.fn(() => 'csrf') }));
vi.mock('../utils/tokenRefreshInterceptor', () => ({ fetchWithTokenRefresh: vi.fn() }));

const { fetchWithTokenRefresh } = await import('../utils/tokenRefreshInterceptor');
const { apiRequest } = await import('./api');
const { olvidaLaRedireccionATerminos, seVaAAceptarLosTerminos } = await import('../utils/terminosPendientes');

const respuesta403 = (error_code) => ({
  ok: false,
  status: 403,
  statusText: 'Forbidden',
  json: async () => ({ detail: 'Terms not accepted', error_code }),
});

const enUna = (pathname, search = '') => {
  const assign = vi.fn();
  vi.stubGlobal('location', { pathname, search, hash: '', origin: 'http://localhost', assign });
  return assign;
};

// Una recarga: la marca del módulo se pierde, sessionStorage no
const recarga = () => olvidaLaRedireccionATerminos();

describe('apiRequest · Términos sin aceptar (F4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.sessionStorage.clear();
    olvidaLaRedireccionATerminos();
    fetchWithTokenRefresh.mockResolvedValue(respuesta403('TERMS_NOT_ACCEPTED'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('en una ruta protegida: redirige recordando dónde estaba, y la llamada falla con el error marcado', async () => {
    const assign = enUna('/competitions/7', '?tab=agenda');

    const error = await apiRequest('/api/v1/competitions/7').catch((e) => e);

    expect(assign).toHaveBeenCalledWith('/accept-terms?from=%2Fcompetitions%2F7%3Ftab%3Dagenda');
    expect(error).toMatchObject({ status: 403, errorCode: 'TERMS_NOT_ACCEPTED' });
    expect(seVaAAceptarLosTerminos()).toBe(true);
  });

  it('varias llamadas a la vez: una sola redirección, y todas terminan', async () => {
    const assign = enUna('/dashboard');

    const resultados = await Promise.allSettled([apiRequest('/api/v1/a'), apiRequest('/api/v1/b'), apiRequest('/api/v1/c')]);

    expect(assign).toHaveBeenCalledTimes(1);
    expect(resultados.every((r) => r.status === 'rejected')).toBe(true);
  });

  it('la misma ruta vuelve a dar 403 tras la recarga: no redirige otra vez (sin bucle)', async () => {
    const assign = enUna('/dashboard');
    await apiRequest('/api/v1/a').catch(() => {});
    recarga();

    const error = await apiRequest('/api/v1/a').catch((e) => e);

    expect(assign).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({ errorCode: 'TERMS_NOT_ACCEPTED' });
  });

  it('otra ruta tras la recarga sí redirige', async () => {
    const assign = enUna('/dashboard');
    await apiRequest('/api/v1/a').catch(() => {});
    recarga();
    enUna('/profile').mockImplementation(assign);

    await apiRequest('/api/v1/b').catch(() => {});

    expect(assign).toHaveBeenCalledTimes(2);
  });

  it('si la página no llega a descargarse, la marca caduca', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const assign = enUna('/dashboard');
    await apiRequest('/api/v1/a').catch(() => {});
    globalThis.sessionStorage.clear();

    vi.setSystemTime(Date.now() + 60_000);

    expect(seVaAAceptarLosTerminos()).toBe(false);
    await apiRequest('/api/v1/a').catch(() => {});
    expect(assign).toHaveBeenCalledTimes(2);
  });

  it('sin sessionStorage utilizable, redirige igual sin romper', async () => {
    const assign = enUna('/dashboard');
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('bloqueado'); },
      removeItem: () => { throw new Error('bloqueado'); },
      clear: () => {},
    });

    const error = await apiRequest('/api/v1/a').catch((e) => e);

    expect(assign).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({ errorCode: 'TERMS_NOT_ACCEPTED' });
  });

  it.each([['/accept-terms'], ['/auth/complete-profile'], ['/profile/devices'], ['/terms'], ['/privacy'], ['/legal'], ['/']])(
    'en %s no redirige: lanza el error marcado',
    async (ruta) => {
      const assign = enUna(ruta);

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
