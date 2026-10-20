import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Revisión final del 21 oct: la sonda refrescaba por su cuenta, saltándose el
 * refresco compartido del interceptor. Dos refrescos a la vez eran dos POST, y
 * con el refresh token rotando el segundo podía llegar con una cookie ya
 * gastada. Aquí van el interceptor y la sonda DE VERDAD; solo `fetch` es falso.
 *
 *   #    a la vez                                   | POST al refresco
 *   -----|-------------------------------------------|-----------------
 *   RC1  dos sondas con el access caducado          | uno, y las dos acaban ok
 *   RC2  una sonda y una petición del interceptor   | uno
 *   RC3  `refrescoCompartido` dos veces             | uno, la misma promesa
 *   RC4  uno detrás de otro (no a la vez)           | dos: no se queda pegado
 */

vi.mock('../contexts/csrfTokenSync', () => ({ setCsrfTokenGlobal: vi.fn() }));
vi.mock('../utils/deviceRevocationLogout', async (original) => ({
  ...(await original()),
  handleDeviceRevocationLogout: vi.fn(),
  handleSessionExpiredLogout: vi.fn(),
}));

const { preguntaLaSesionSinInterceptor } = await import('./sondaDeSesion');
const { fetchWithTokenRefresh, refrescoCompartido } = await import('../utils/tokenRefreshInterceptor');

const USUARIO = { id: 'u1' };
const respuesta = (status, cuerpo = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => cuerpo,
  clone() {
    return respuesta(status, cuerpo);
  },
});

// El refresco tarda: se suelta a mano, para que las dos peticiones lo pillen en vuelo
let sueltaElRefresco;
const fetchFalso = vi.fn();
const postsAlRefresco = () =>
  fetchFalso.mock.calls.filter(([url]) => String(url).includes('/auth/refresh-token')).length;

// Hasta que la condición se cumpla, dejando correr las promesas pendientes
const hasta = async (condicion) => {
  for (let i = 0; i < 50 && !condicion(); i += 1) await Promise.resolve();
};

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  fetchFalso.mockReset();
  vi.stubGlobal('fetch', fetchFalso);
  sueltaElRefresco = null;
  // Las preguntas a `current-user` dan 401 hasta que termina el refresco
  let refrescado = false;
  fetchFalso.mockImplementation((url) => {
    if (String(url).includes('/auth/refresh-token')) {
      // Suelta TODOS los que haya en vuelo: si hubiera dos, el test falla por
      // la cuenta y no por quedarse colgado
      return new Promise((resolve) => {
        const previo = sueltaElRefresco;
        sueltaElRefresco = () => {
          previo?.();
          refrescado = true;
          resolve(respuesta(200, {}));
        };
      });
    }
    return Promise.resolve(refrescado ? respuesta(200, USUARIO) : respuesta(401, { detail: 'expired' }));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('la sonda usa el refresco compartido del interceptor', () => {
  it('RC1: dos sondas a la vez piden UN refresco, y las dos acaban ok', async () => {
    const a = preguntaLaSesionSinInterceptor();
    const b = preguntaLaSesionSinInterceptor();
    await hasta(() => postsAlRefresco() > 0 && sueltaElRefresco);
    await hasta(() => false);
    sueltaElRefresco();

    expect(await a).toEqual({ estado: 'ok', usuario: USUARIO });
    expect(await b).toEqual({ estado: 'ok', usuario: USUARIO });
    expect(postsAlRefresco()).toBe(1);
  });

  it('RC2: una sonda y una petición del interceptor a la vez, UN refresco', async () => {
    const sonda = preguntaLaSesionSinInterceptor();
    const peticion = fetchWithTokenRefresh('/api/v1/quick-matches');
    await hasta(() => false);
    sueltaElRefresco();

    expect(await sonda).toEqual({ estado: 'ok', usuario: USUARIO });
    expect((await peticion).status).toBe(200);
    expect(postsAlRefresco()).toBe(1);
  });

  it('RC3: refrescoCompartido dos veces a la vez es la misma promesa', async () => {
    const a = refrescoCompartido();
    const b = refrescoCompartido();
    expect(b).toBe(a);
    await hasta(() => sueltaElRefresco);
    sueltaElRefresco();

    await expect(a).resolves.toBe(true);
    expect(postsAlRefresco()).toBe(1);
  });

  it('RC4: terminado uno, el siguiente pide otro: no se queda pegado al viejo', async () => {
    const a = refrescoCompartido();
    await hasta(() => sueltaElRefresco);
    sueltaElRefresco();
    await a;

    sueltaElRefresco = null;
    const b = refrescoCompartido();
    expect(b).not.toBe(a);
    await hasta(() => sueltaElRefresco);
    sueltaElRefresco();
    await b;

    expect(postsAlRefresco()).toBe(2);
  });
});
