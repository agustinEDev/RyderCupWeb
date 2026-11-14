import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Como en la app: la respuesta de la interfaz al transporte, registrada antes de nada
import '../../composition/interfazDelTransporte';
import { fetchWithTokenRefresh } from './tokenRefreshInterceptor';
import { preguntaLaSesionSinInterceptor } from '../../services/sondaDeSesion';
import { apuntaElCierrePendiente, hayCierrePendiente } from './cierrePendiente';

/**
 * Las dos puertas por las que el front habla con la API con la sesión puesta: el
 * transporte (`fetchWithTokenRefresh`, por el que pasan `apiRequest` y la consulta
 * compartida de la sesión) y la sonda de `/login` (`preguntaLaSesionSinInterceptor`).
 * Con un cierre pendiente, ninguna pregunta nada antes de mandarlo (F-01).
 *
 *   caso                                           | qué pasa
 *   -----------------------------------------------|----------------------------------
 *   E4 transporte con marca y red                  | primero el cierre, luego la petición
 *   E2 transporte con marca y sin red              | falla como «sin conexión», no sale
 *   transporte sin marca                           | la petición, como siempre
 *   E4 sonda con marca y red                       | primero el cierre, luego pregunta
 *   E2 sonda con marca y sin red                   | «fallo», sin preguntar por la sesión
 */

const respuesta = (status, cuerpo = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: new globalThis.Headers(),
  json: async () => cuerpo,
  clone() {
    return respuesta(status, cuerpo);
  },
});

const rutas = () =>
  fetch.mock.calls.map(([url]) => new globalThis.URL(url, 'http://x').pathname);

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('el transporte espera al cierre pendiente', () => {
  it('E4: con la marca y red, primero el cierre y luego la petición', async () => {
    apuntaElCierrePendiente();
    fetch
      .mockResolvedValueOnce(respuesta(200))
      .mockResolvedValueOnce(respuesta(200, { ok: true }));
    const r = await fetchWithTokenRefresh('/api/v1/competitions', {});
    expect(r.status).toBe(200);
    expect(rutas()).toEqual(['/api/v1/auth/logout', '/api/v1/competitions']);
    expect(hayCierrePendiente()).toBe(false);
  });

  it('E2: con la marca y sin red, falla como «sin conexión» sin mandar la petición', async () => {
    apuntaElCierrePendiente();
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      fetchWithTokenRefresh('/api/v1/competitions', {}),
    ).rejects.toBeInstanceOf(TypeError);
    expect(rutas()).toEqual(['/api/v1/auth/logout']);
    expect(hayCierrePendiente()).toBe(true);
  });

  it('sin marca, la petición como siempre', async () => {
    fetch.mockResolvedValueOnce(respuesta(200));
    await fetchWithTokenRefresh('/api/v1/competitions', {});
    expect(rutas()).toEqual(['/api/v1/competitions']);
  });
});

describe('la sonda de la sesión espera al cierre pendiente', () => {
  it('E4: con la marca y red, primero el cierre y luego pregunta', async () => {
    apuntaElCierrePendiente();
    fetch
      .mockResolvedValueOnce(respuesta(200))
      .mockResolvedValueOnce(respuesta(200, { id: 'u-1' }));
    const r = await preguntaLaSesionSinInterceptor();
    expect(rutas()).toEqual([
      '/api/v1/auth/logout',
      '/api/v1/auth/current-user',
    ]);
    expect(r.estado).toBe('ok');
  });

  it('E2: con la marca y sin red, «fallo» sin preguntar por la sesión', async () => {
    apuntaElCierrePendiente();
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    const r = await preguntaLaSesionSinInterceptor();
    expect(r.estado).toBe('fallo');
    expect(rutas()).toEqual(['/api/v1/auth/logout']);
  });
});

describe('al volver la red', () => {
  it('E3: con la app abierta, manda el cierre pendiente', async () => {
    const { vigilaLaVueltaALaAplicacion } =
      await import('../../services/sesionCompartida');
    apuntaElCierrePendiente();
    fetch.mockResolvedValue(respuesta(200));
    const deja = vigilaLaVueltaALaAplicacion();
    globalThis.dispatchEvent(new globalThis.Event('online'));
    await vi.waitFor(() => expect(hayCierrePendiente()).toBe(false));
    expect(rutas()[0]).toBe('/api/v1/auth/logout');
    deja();
  });
});
