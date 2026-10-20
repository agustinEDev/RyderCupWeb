import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * F4: un 403 `TERMS_NOT_ACCEPTED` de cualquier llamada lleva a la pantalla de
 * aceptar los Términos en vez de un error genérico, UNA sola vez.
 *
 *   caso                                                  | qué pasa
 *   ------------------------------------------------------|------------------------------------------
 *   una ruta protegida                                    | redirige a /accept-terms?from=…; la llamada falla con el error marcado y su aviso silenciado
 *   varias llamadas a la vez, o un sondeo con 403 seguidos| una sola redirección en esta carga, nunca dos
 *   pasado el plazo sin que la página se descargue        | sigue sin segunda redirección; el error ya se enseña («no disponible»)
 *   desacuerdo: tras la recarga, la MISMA ruta da 403     | no redirige más en esta carga (ni esa ni otra): error «no disponible» visible
 *   otra ruta tras la recarga (sin desacuerdo)            | redirige
 *   sessionStorage bloqueado                              | redirige una vez, y la memoria evita la segunda en la misma carga
 *   rutas con Términos pendientes o públicas              | no redirige
 *   otro 403                                              | el error de siempre
 */
vi.mock('../contexts/csrfTokenSync', () => ({ getCsrfToken: vi.fn(() => 'csrf') }));
vi.mock('../utils/tokenRefreshInterceptor', () => ({ fetchWithTokenRefresh: vi.fn() }));
vi.mock('i18next', () => ({ default: { t: (clave) => `t(${clave})` } }));

const { fetchWithTokenRefresh } = await import('../utils/tokenRefreshInterceptor');
const { apiRequest } = await import('./api');
const { olvidaLaRedireccionATerminos, esUnAvisoSilenciado } = await import('../utils/terminosPendientes');

const AVISO_DE_ACEPTAR = 't(common:terminosPendientes)';
const NO_DISPONIBLE = 't(common:terminosNoDisponible)';

const respuesta403 = (error_code) => ({
  ok: false,
  status: 403,
  statusText: 'Forbidden',
  json: async () => ({ detail: 'Terms not accepted', error_code }),
});

const enUna = (pathname, search = '', assign = vi.fn()) => {
  vi.stubGlobal('location', { pathname, search, hash: '', origin: 'http://localhost', assign });
  return assign;
};

// Una recarga: lo del módulo se pierde, sessionStorage no
const recarga = () => olvidaLaRedireccionATerminos();
const falla = (ruta = '/api/v1/a') => apiRequest(ruta).catch((e) => e);

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

  it('en una ruta protegida: redirige recordando dónde estaba; la llamada falla marcada y su aviso no se enseña', async () => {
    const assign = enUna('/competitions/7', '?tab=agenda');

    const error = await falla('/api/v1/competitions/7');

    expect(assign).toHaveBeenCalledWith('/accept-terms?from=%2Fcompetitions%2F7%3Ftab%3Dagenda');
    expect(error).toMatchObject({ status: 403, errorCode: 'TERMS_NOT_ACCEPTED', message: AVISO_DE_ACEPTAR });
    expect(esUnAvisoSilenciado(error.message)).toBe(true);
  });

  it('varias llamadas a la vez: una sola redirección, y todas terminan', async () => {
    const assign = enUna('/dashboard');

    const resultados = await Promise.allSettled([apiRequest('/api/v1/a'), apiRequest('/api/v1/b'), apiRequest('/api/v1/c')]);

    expect(assign).toHaveBeenCalledTimes(1);
    expect(resultados.every((r) => r.status === 'rejected')).toBe(true);
  });

  it('un sondeo con 403 seguidos en la misma carga: una sola redirección', async () => {
    const assign = enUna('/dashboard');

    for (let i = 0; i < 5; i += 1) await falla();

    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('pasado el plazo sin descargarse la página: nunca una segunda redirección, y el error ya se ve', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const assign = enUna('/dashboard');
    await falla();
    globalThis.sessionStorage.clear();

    vi.setSystemTime(Date.now() + 60_000);
    const error = await falla();

    expect(assign).toHaveBeenCalledTimes(1);
    expect(error.message).toBe(NO_DISPONIBLE);
    expect(esUnAvisoSilenciado(error.message)).toBe(false);
  });

  it('desacuerdo: tras la recarga la misma ruta vuelve a dar 403 → no se redirige más en esta carga', async () => {
    const assign = enUna('/dashboard');
    await falla();
    recarga();
    // Se acepta (la sesión dice aceptado) y se vuelve a /dashboard, que sigue dando 403

    const error = await falla();
    enUna('/profile', '', assign);
    const deOtraRuta = await falla();

    expect(assign).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({ errorCode: 'TERMS_NOT_ACCEPTED', message: NO_DISPONIBLE });
    expect(esUnAvisoSilenciado(error.message)).toBe(false);
    expect(deOtraRuta.message).toBe(NO_DISPONIBLE);
  });

  it('otra ruta tras la recarga, sin desacuerdo: redirige', async () => {
    const assign = enUna('/dashboard');
    await falla();
    recarga();
    enUna('/profile', '', assign);

    await falla();

    expect(assign).toHaveBeenCalledTimes(2);
  });

  it('sessionStorage bloqueado: redirige una vez y la memoria evita la segunda en la misma carga', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const assign = enUna('/dashboard');
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('bloqueado'); },
      removeItem: () => { throw new Error('bloqueado'); },
      clear: () => {},
    });

    await falla();
    vi.setSystemTime(Date.now() + 60_000);
    enUna('/profile', '', assign);
    await falla();

    expect(assign).toHaveBeenCalledTimes(1);
  });

  it.each([['/accept-terms'], ['/auth/complete-profile'], ['/profile/devices'], ['/profile/devices/'], ['/terms'], ['/privacy'], ['/legal'], ['/']])(
    'en %s no redirige: lanza el error marcado, visible',
    async (ruta) => {
      const assign = enUna(ruta);

      const error = await falla('/api/v1/users/me/devices');

      expect(assign).not.toHaveBeenCalled();
      expect(error).toMatchObject({ status: 403, errorCode: 'TERMS_NOT_ACCEPTED' });
      expect(esUnAvisoSilenciado(error.message)).toBe(false);
    }
  );

  it('otro 403: el error de siempre, sin redirigir', async () => {
    const assign = enUna('/dashboard');
    fetchWithTokenRefresh.mockResolvedValue(respuesta403('NOT_THE_CREATOR'));

    const error = await falla('/api/v1/x');

    expect(assign).not.toHaveBeenCalled();
    expect(error).toMatchObject({ status: 403, errorCode: 'NOT_THE_CREATOR' });
  });
});
