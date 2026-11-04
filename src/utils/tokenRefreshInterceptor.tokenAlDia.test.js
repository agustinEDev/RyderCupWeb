/**
 * El reintento tras un 401 lleva el token CSRF de DESPUÉS del refresco
 * (hotfix 2.63.1, revisor).
 *
 * El refresco rota la cookie CSRF, y el reintento repetía las opciones de la
 * petición original, con el token de antes: el POST que daba 401 volvía con un
 * 403 CSRF. Ahora lo arregla `apiRequest` con un segundo refresco, pero sobra.
 *
 *   #  camino del reintento                        | cabecera del reintento
 *   ---|------------------------------------------|-------------------------
 *   28 refresca él                                | el token nuevo
 *   29 se engancha a un refresco en vuelo         | el token nuevo
 *   30 ya se refrescó después de que saliera      | el token nuevo
 *   31 una petición sin cabecera CSRF (un GET)    | sigue sin ella
 *   32 cabeceras como `Headers`                   | el token nuevo
 *   35 la cabecera en minúsculas (`x-csrf-token`) | una sola, con el token nuevo
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let fetchWithTokenRefresh;
let refrescoCompartido;
let setCsrfTokenGlobal;

const r401 = () => ({ ok: false, status: 401, clone: () => ({ json: async () => ({ detail: 'expired' }) }) });
const r200 = (cuerpo = {}) => ({ ok: true, status: 200, json: async () => cuerpo });

const esRefresco = (url) => String(url).includes('/auth/refresh-token');
const peticiones = () => globalThis.fetch.mock.calls.filter(([url]) => !esRefresco(url));
const cabeceraDe = (opciones) =>
  opciones.headers instanceof globalThis.Headers
    ? opciones.headers.get('X-CSRF-Token')
    : opciones.headers?.['X-CSRF-Token'];

describe('reintento tras 401 con el token al día', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ fetchWithTokenRefresh, refrescoCompartido } = await import('./tokenRefreshInterceptor'));
    ({ setCsrfTokenGlobal } = await import('../contexts/csrfTokenSync'));
    // Sin cookie legible: el token sale de la copia que deja el refresco
    vi.spyOn(document, 'cookie', 'get').mockReturnValue('');
    setCsrfTokenGlobal('VIEJO');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const conRefresco = (primera) => {
    let llamadas = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (esRefresco(url)) return r200({ csrf_token: 'NUEVO' });
        llamadas += 1;
        return llamadas === 1 ? primera() : r200({ ok: true });
      })
    );
  };

  const post = (headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': 'VIEJO' }) =>
    fetchWithTokenRefresh('/api/v1/quick-matches/start', { method: 'POST', body: '{}', headers });

  it('28: refresca él y el reintento lleva el token nuevo', async () => {
    conRefresco(r401);

    await post();

    const [primera, segunda] = peticiones();
    expect(cabeceraDe(primera[1])).toBe('VIEJO');
    expect(cabeceraDe(segunda[1])).toBe('NUEVO');
    expect(segunda[1].body).toBe('{}');
  });

  it('29: enganchado a un refresco en vuelo, también el nuevo', async () => {
    conRefresco(r401);
    const enVuelo = refrescoCompartido();

    await Promise.all([enVuelo, post()]);

    expect(cabeceraDe(peticiones().at(-1)[1])).toBe('NUEVO');
  });

  it('30: si ya se refrescó después de que saliera, también el nuevo', async () => {
    let suelta401;
    let llamadas = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        if (esRefresco(url)) return Promise.resolve(r200({ csrf_token: 'NUEVO' }));
        llamadas += 1;
        if (llamadas === 1) return new Promise((resuelve) => (suelta401 = () => resuelve(r401())));
        return Promise.resolve(r200());
      })
    );

    const peticion = post();
    await refrescoCompartido();
    suelta401();
    await peticion;

    expect(globalThis.fetch.mock.calls.filter(([url]) => esRefresco(url))).toHaveLength(1);
    expect(cabeceraDe(peticiones().at(-1)[1])).toBe('NUEVO');
  });

  it('31: una petición sin cabecera CSRF sigue sin ella', async () => {
    conRefresco(r401);

    await fetchWithTokenRefresh('/api/v1/quick-matches/me', { headers: { 'Content-Type': 'application/json' } });

    expect(cabeceraDe(peticiones().at(-1)[1])).toBeUndefined();
  });

  it('32: con cabeceras `Headers`, también el nuevo', async () => {
    conRefresco(r401);

    await post(new globalThis.Headers({ 'X-CSRF-Token': 'VIEJO' }));

    expect(cabeceraDe(peticiones().at(-1)[1])).toBe('NUEVO');
  });

  it('35: una cabecera en minúsculas también se pone al día, sin duplicarla', async () => {
    conRefresco(r401);

    await post({ 'x-csrf-token': 'VIEJO' });

    const cabeceras = peticiones().at(-1)[1].headers;
    const csrf = Object.keys(cabeceras).filter((k) => k.toLowerCase() === 'x-csrf-token');
    expect(csrf).toHaveLength(1);
    expect(cabeceras[csrf[0]]).toBe('NUEVO');
  });
});
