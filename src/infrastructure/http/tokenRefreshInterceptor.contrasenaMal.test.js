/**
 * Un 401 por la contraseña actual mal escrita no se refresca ni se repite
 * (RyderCupAm #753). Cada petición a Seguridad y a la reautenticación cuenta en un
 * límite por usuario: repetirla gastaba dos intentos por error, y con dos erratas
 * el cambio de correo quedaba bloqueado una hora.
 *
 *   #   ruta                         | 401                       | resultado
 *   ----|-------------------------------|---------------------------|---------------------------
 *   W1  PATCH /users/security        | contraseña mal            | se devuelve, sin refrescar
 *   W2  POST /auth/reauthenticate    | contraseña mal            | se devuelve, sin refrescar
 *   W3  PATCH /users/security        | token caducado            | se refresca y se repite
 *   W4  otra ruta                    | cualquier 401             | se refresca, como siempre
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Como en la app: la respuesta de la interfaz al transporte, registrada antes de nada
import '../../composition/interfazDelTransporte';

vi.mock('./deviceRevocationLogout', async (original) => ({
  ...(await original()),
  handleSessionExpiredLogout: vi.fn(),
  handleDeviceRevocationLogout: vi.fn(),
}));

const respuesta = (status, cuerpo = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  url: '',
  headers: new globalThis.Headers({ 'content-type': 'application/json' }),
  json: async () => cuerpo,
  clone() {
    return respuesta(status, cuerpo);
  },
});
const CONTRASENA_MAL = { detail: 'Current password is incorrect' };
const TOKEN_CADUCADO = { detail: 'Token inválido o expirado' };

const esRefresco = (url) => String(url).includes('/auth/refresh-token');

describe('el interceptor no repite un 401 por contraseña mal escrita', () => {
  let fetchWithTokenRefresh;

  beforeEach(async () => {
    vi.resetModules();
    await import('../../composition/interfazDelTransporte');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    ({ fetchWithTokenRefresh } = await import('./tokenRefreshInterceptor'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const con = (primera) => {
    let llamadas = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (esRefresco(url)) return respuesta(200, { csrf_token: 'N' });
        llamadas += 1;
        return llamadas === 1
          ? respuesta(401, primera)
          : respuesta(200, { ok: true });
      }),
    );
  };
  const refrescos = () =>
    globalThis.fetch.mock.calls.filter(([u]) => esRefresco(u)).length;
  const peticiones = () =>
    globalThis.fetch.mock.calls.filter(([u]) => !esRefresco(u)).length;

  it.each([
    ['W1', '/api/v1/users/security', 'PATCH'],
    ['W2', '/api/v1/auth/reauthenticate', 'POST'],
  ])(
    '%s: %s con la contraseña mal se devuelve tal cual',
    async (_caso, ruta, metodo) => {
      con(CONTRASENA_MAL);

      const r = await fetchWithTokenRefresh(ruta, {
        method: metodo,
        headers: {},
      });

      expect(r.status).toBe(401);
      expect(refrescos()).toBe(0);
      expect(peticiones()).toBe(1);
    },
  );

  it('W3: con el token caducado, Seguridad sí se refresca y se repite', async () => {
    con(TOKEN_CADUCADO);

    const r = await fetchWithTokenRefresh('/api/v1/users/security', {
      method: 'PATCH',
      headers: {},
    });

    expect(r.status).toBe(200);
    expect(refrescos()).toBe(1);
    expect(peticiones()).toBe(2);
  });

  it('W5: «falta el dispositivo» es de token: se refresca (BE #737, el refresco trae did)', async () => {
    con({ detail: 'Token inválido: falta el dispositivo' });

    const r = await fetchWithTokenRefresh('/api/v1/auth/reauthenticate', {
      method: 'POST',
      headers: {},
    });

    expect(r.status).toBe(200);
    expect(refrescos()).toBe(1);
  });

  it('W4: otra ruta se refresca como siempre', async () => {
    con(CONTRASENA_MAL);

    const r = await fetchWithTokenRefresh('/api/v1/users/me', {
      method: 'GET',
      headers: {},
    });

    expect(r.status).toBe(200);
    expect(refrescos()).toBe(1);
  });
});
