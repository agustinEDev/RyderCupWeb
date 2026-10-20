import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * La pregunta a `/current-user` sin el interceptor, una sola pieza para las dos
 * paginas que la necesitan: la de acceso (`useRedirectIfAuthenticated`) y
 * «Volver» de los documentos legales. Antes cada una tenia su copia.
 *
 *   #    el backend                                   | resultado
 *   -----|--------------------------------------------|---------------------------
 *   S1   200                                          | ok, con el DTO tal cual
 *   S2   401, refresco bien, 200                      | ok
 *   S3   401 «dispositivo revocado»                   | revocada, sin refrescar
 *   S4   401, refresco bien, 401                      | rechazada
 *   S5   401, refresco con 401                        | rechazada
 *   S6   401, refresco que falla por otra cosa        | fallo
 *   S7   500                                          | fallo
 *   S8   sin red (TypeError)                          | fallo
 *   S9   401 con cuerpo que no es JSON                | se refresca igual
 *   S10  200 con cuerpo que no es JSON                | fallo
 */

vi.mock('../utils/tokenRefreshInterceptor', () => ({
  refreshAccessToken: vi.fn(),
  fetchWithTokenRefresh: vi.fn(),
}));

const { refreshAccessToken, fetchWithTokenRefresh } = await import('../utils/tokenRefreshInterceptor');
const { preguntaLaSesionSinInterceptor } = await import('./sondaDeSesion');

const USUARIO = { id: 'u1', email: 'a@b.es', first_name: 'Ana' };

const respuesta = (status, cuerpo = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => cuerpo,
});

const sinJson = (status) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    throw new SyntaxError('Unexpected token <');
  },
});

const fetchFalso = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchFalso);
  fetchFalso.mockReset();
  refreshAccessToken.mockReset();
  fetchWithTokenRefresh.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('preguntaLaSesionSinInterceptor', () => {
  it('S1: con 200 da la sesion por buena y devuelve el DTO', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta(200, USUARIO));
    const corte = new AbortController();

    const resultado = await preguntaLaSesionSinInterceptor(corte.signal);

    expect(resultado).toEqual({ estado: 'ok', usuario: USUARIO });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(fetchFalso.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/current-user$/);
    expect(fetchFalso.mock.calls[0][1]).toMatchObject({ credentials: 'include', signal: corte.signal });
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(fetchWithTokenRefresh).not.toHaveBeenCalled();
  });

  it('S2: con el access caducado refresca a mano y repregunta con la misma senal', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta(401)).mockResolvedValueOnce(respuesta(200, USUARIO));
    refreshAccessToken.mockResolvedValueOnce({});
    const corte = new AbortController();

    const resultado = await preguntaLaSesionSinInterceptor(corte.signal);

    expect(resultado).toEqual({ estado: 'ok', usuario: USUARIO });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchFalso).toHaveBeenCalledTimes(2);
    expect(fetchFalso.mock.calls[1][1]).toMatchObject({ signal: corte.signal });
  });

  it('S3: un dispositivo revocado se dice como tal, con su detalle y sin refrescar', async () => {
    const detalle = { detail: 'Dispositivo revocado. Por favor, inicia sesión nuevamente.' };
    fetchFalso.mockResolvedValueOnce(respuesta(401, detalle));

    const resultado = await preguntaLaSesionSinInterceptor();

    expect(resultado).toEqual({ estado: 'revocada', detalle });
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('S4: si tras refrescar sigue el 401, la sesion esta rechazada', async () => {
    fetchFalso.mockResolvedValue(respuesta(401));
    refreshAccessToken.mockResolvedValueOnce({});

    expect(await preguntaLaSesionSinInterceptor()).toEqual({ estado: 'rechazada' });
  });

  it('S5: si el refresco contesta 401, la sesion esta rechazada', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta(401));
    refreshAccessToken.mockRejectedValueOnce(Object.assign(new Error('caducada'), { response: { status: 401 } }));

    expect(await preguntaLaSesionSinInterceptor()).toEqual({ estado: 'rechazada' });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('S6: si el refresco falla por otra cosa, no se sabe: fallo', async () => {
    const error = new TypeError('Failed to fetch');
    fetchFalso.mockResolvedValueOnce(respuesta(401));
    refreshAccessToken.mockRejectedValueOnce(error);

    expect(await preguntaLaSesionSinInterceptor()).toEqual({ estado: 'fallo', error });
  });

  it('S7: un error del servidor es un fallo, no un rechazo', async () => {
    fetchFalso.mockResolvedValueOnce(respuesta(500));

    const resultado = await preguntaLaSesionSinInterceptor();

    expect(resultado.estado).toBe('fallo');
    expect(resultado.error).toBeInstanceOf(Error);
    expect(resultado.error.message).toContain('500');
  });

  it('S8: sin red es un fallo', async () => {
    const error = new TypeError('Failed to fetch');
    fetchFalso.mockRejectedValueOnce(error);

    expect(await preguntaLaSesionSinInterceptor()).toEqual({ estado: 'fallo', error });
  });

  it('S9: un 401 con un cuerpo que no es JSON se refresca igual', async () => {
    fetchFalso.mockResolvedValueOnce(sinJson(401)).mockResolvedValueOnce(respuesta(200, USUARIO));
    refreshAccessToken.mockResolvedValueOnce({});

    expect(await preguntaLaSesionSinInterceptor()).toEqual({ estado: 'ok', usuario: USUARIO });
  });

  it('S10: un 200 con un cuerpo que no es JSON es un fallo', async () => {
    fetchFalso.mockResolvedValueOnce(sinJson(200));

    const resultado = await preguntaLaSesionSinInterceptor();

    expect(resultado.estado).toBe('fallo');
    expect(resultado.error).toBeInstanceOf(SyntaxError);
  });
});
