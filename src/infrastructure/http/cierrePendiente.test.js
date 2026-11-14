import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  apuntaElCierrePendiente,
  hayCierrePendiente,
  olvidaElCierrePendiente,
  mandaElCierrePendiente,
  esperaAlCierrePendiente,
} from './cierrePendiente';

/**
 * Cerrar la sesión sin cobertura (auditoría de la fase 6, F-01).
 *
 * Las cookies de la sesión son httpOnly: solo el servidor las borra. Si el cierre
 * no le llega, la app queda «fuera» pero la sesión sigue viva en el móvil, y
 * quien lo abra después entra. La marca de «cierre pendiente» lo arregla: se
 * apunta antes de llamar al servidor y, mientras esté, el cierre va antes que
 * cualquier otra petición.
 *
 *   caso                                              | qué pasa
 *   --------------------------------------------------|---------------------------------
 *   E2 marca apuntada                                 | sobrevive a la recarga (localStorage)
 *   sin marca                                         | no se manda nada
 *   E3/E4 el servidor confirma (200)                  | se borra la marca
 *   sin red                                           | la marca sigue y se avisa del fallo
 *   el servidor no contesta a tiempo                  | igual que sin red
 *   5xx                                               | igual que sin red: no se sabe si cerró
 *   E5 acceso caducado: 401 → refresco → cierre       | se borra la marca
 *   E5 401 y el refresco también 401 (sesión muerta)  | se borra la marca
 *   429, 408 o un 4xx sin código de la app (borde)    | la marca sigue
 *   un cuerpo que no termina de llegar                | igual que sin red, sin colgarse
 *   otro 4xx de la app (con su código)                | se borra: no se queda la app atascada
 *   refresco bien y el cierre sigue en 401            | la marca sigue
 *   otra pestaña ya lo resolvió                       | no se refresca (no mata la sesión nueva)
 *   entre pestañas                                    | un cierre a la vez (navigator.locks)
 *   marca de más de 7 días                            | se olvida: la sesión ya no puede vivir
 *   el cierre lleva su token CSRF                     | el de la cookie, también tras refrescar
 *   dos a la vez                                      | un solo cierre
 *   E2/E6 una petición con la marca                   | espera al cierre; sin red, falla sin salir
 */

const URL_DEL_CIERRE = '/api/v1/auth/logout';
const URL_DEL_REFRESCO = '/api/v1/auth/refresh-token';

const respuesta = (status) => ({ ok: status >= 200 && status < 300, status });

let almacen;
let galletas;

beforeEach(() => {
  almacen = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => almacen.set(k, String(v)),
    removeItem: (k) => almacen.delete(k),
  });
  galletas = 'csrf_token=uno';
  Object.defineProperty(globalThis.document, 'cookie', {
    configurable: true,
    get: () => galletas,
  });
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const llamadasA = (trozo) =>
  fetch.mock.calls.filter(([url]) => String(url).includes(trozo));

describe('la marca del cierre pendiente', () => {
  it('E2: se apunta, sobrevive en el almacenamiento y se olvida', () => {
    expect(hayCierrePendiente()).toBe(false);
    apuntaElCierrePendiente();
    expect(hayCierrePendiente()).toBe(true);
    expect([...almacen.keys()]).toHaveLength(1);
    olvidaElCierrePendiente();
    expect(hayCierrePendiente()).toBe(false);
  });

  it('sin almacenamiento no rompe: no hay marca', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => {
        throw new Error('bloqueado');
      },
    });
    expect(() => apuntaElCierrePendiente()).not.toThrow();
    expect(hayCierrePendiente()).toBe(false);
  });
});

describe('mandar el cierre pendiente', () => {
  it('sin marca no se manda nada', async () => {
    await mandaElCierrePendiente();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('E3/E4: el servidor confirma y se borra la marca', async () => {
    apuntaElCierrePendiente();
    fetch.mockResolvedValueOnce(respuesta(200));
    await mandaElCierrePendiente();
    expect(llamadasA(URL_DEL_CIERRE)).toHaveLength(1);
    const [, opciones] = llamadasA(URL_DEL_CIERRE)[0];
    expect(opciones.method).toBe('POST');
    expect(opciones.credentials).toBe('include');
    expect(hayCierrePendiente()).toBe(false);
  });

  it('el cierre lleva el token CSRF de la cookie', async () => {
    apuntaElCierrePendiente();
    fetch.mockResolvedValueOnce(respuesta(200));
    await mandaElCierrePendiente();
    const [, opciones] = llamadasA(URL_DEL_CIERRE)[0];
    expect(opciones.headers['X-CSRF-Token']).toBe('uno');
  });

  it('sin red la marca sigue y se avisa del fallo', async () => {
    apuntaElCierrePendiente();
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(mandaElCierrePendiente()).rejects.toBeInstanceOf(TypeError);
    expect(hayCierrePendiente()).toBe(true);
  });

  it('si el servidor no contesta a tiempo es como no tener red', async () => {
    vi.useFakeTimers();
    apuntaElCierrePendiente();
    fetch.mockImplementationOnce(
      (_url, { signal }) =>
        new Promise((_, rechaza) =>
          signal.addEventListener('abort', () =>
            rechaza(new globalThis.DOMException('cortado', 'AbortError')),
          ),
        ),
    );
    const envio = mandaElCierrePendiente();
    const comprobacion = expect(envio).rejects.toBeInstanceOf(TypeError);
    await vi.advanceTimersByTimeAsync(20_000);
    await comprobacion;
    expect(hayCierrePendiente()).toBe(true);
  });

  it('un 5xx deja la marca: no se sabe si el servidor cerró', async () => {
    apuntaElCierrePendiente();
    fetch.mockResolvedValueOnce(respuesta(503));
    await expect(mandaElCierrePendiente()).rejects.toBeInstanceOf(TypeError);
    expect(hayCierrePendiente()).toBe(true);
  });

  it('un 5xx de la app (con su código) también deja la marca', async () => {
    apuntaElCierrePendiente();
    fetch.mockResolvedValueOnce({
      ...respuesta(500),
      json: async () => ({ error_code: 'INTERNAL_ERROR' }),
    });
    await expect(mandaElCierrePendiente()).rejects.toBeInstanceOf(TypeError);
    expect(hayCierrePendiente()).toBe(true);
  });

  it('E5: con el acceso caducado refresca, repite el cierre y borra la marca', async () => {
    apuntaElCierrePendiente();
    fetch
      .mockResolvedValueOnce(respuesta(401))
      .mockImplementationOnce(async () => {
        galletas = 'csrf_token=dos';
        return respuesta(200);
      })
      .mockResolvedValueOnce(respuesta(200));
    await mandaElCierrePendiente();
    expect(llamadasA(URL_DEL_REFRESCO)).toHaveLength(1);
    expect(llamadasA(URL_DEL_CIERRE)).toHaveLength(2);
    // El segundo cierre, con el token que dejó el refresco
    expect(llamadasA(URL_DEL_CIERRE)[1][1].headers['X-CSRF-Token']).toBe('dos');
    expect(hayCierrePendiente()).toBe(false);
  });

  it('E5: si el refresco también dice 401, la sesión ya está muerta y se borra la marca', async () => {
    apuntaElCierrePendiente();
    fetch
      .mockResolvedValueOnce(respuesta(401))
      .mockResolvedValueOnce(respuesta(401));
    await mandaElCierrePendiente();
    expect(llamadasA(URL_DEL_CIERRE)).toHaveLength(1);
    expect(hayCierrePendiente()).toBe(false);
  });

  it('el refresco sin red deja la marca', async () => {
    apuntaElCierrePendiente();
    fetch
      .mockResolvedValueOnce(respuesta(401))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(mandaElCierrePendiente()).rejects.toBeInstanceOf(TypeError);
    expect(hayCierrePendiente()).toBe(true);
  });

  it('un 403 sin código de la app (Cloudflare) deja la marca', async () => {
    apuntaElCierrePendiente();
    fetch.mockResolvedValueOnce(respuesta(403));
    await expect(mandaElCierrePendiente()).rejects.toBeInstanceOf(TypeError);
    expect(hayCierrePendiente()).toBe(true);
  });

  it('un 429 de la app (con su código) también deja la marca', async () => {
    apuntaElCierrePendiente();
    fetch.mockResolvedValueOnce({
      ...respuesta(429),
      json: async () => ({ error_code: 'RATE_LIMIT_EXCEEDED' }),
    });
    await expect(mandaElCierrePendiente()).rejects.toBeInstanceOf(TypeError);
    expect(hayCierrePendiente()).toBe(true);
  });

  it('un 429 deja la marca', async () => {
    apuntaElCierrePendiente();
    fetch.mockResolvedValueOnce(respuesta(429));
    await expect(mandaElCierrePendiente()).rejects.toBeInstanceOf(TypeError);
    expect(hayCierrePendiente()).toBe(true);
  });

  it('code-review: un 404 o 400 sin código de la app (borde o proxy) deja la marca', async () => {
    apuntaElCierrePendiente();
    fetch.mockResolvedValueOnce({
      ...respuesta(404),
      json: async () => {
        throw new SyntaxError('html');
      },
    });
    await expect(mandaElCierrePendiente()).rejects.toBeInstanceOf(TypeError);
    expect(hayCierrePendiente()).toBe(true);
  });

  it('code-review: un cuerpo que no termina de llegar no deja el envío colgado', async () => {
    vi.useFakeTimers();
    apuntaElCierrePendiente();
    fetch.mockImplementationOnce(async (_url, { signal }) => ({
      ...respuesta(403),
      json: () =>
        new Promise((_, rechaza) =>
          signal.addEventListener('abort', () =>
            rechaza(new globalThis.DOMException('cortado', 'AbortError')),
          ),
        ),
    }));
    const envio = mandaElCierrePendiente();
    const comprobacion = expect(envio).rejects.toBeInstanceOf(TypeError);
    await vi.advanceTimersByTimeAsync(20_000);
    await comprobacion;
    expect(hayCierrePendiente()).toBe(true);
  });

  it('otra respuesta de la app (un 4xx con su código) borra la marca: no se queda atascada', async () => {
    apuntaElCierrePendiente();
    fetch.mockResolvedValueOnce({
      ...respuesta(400),
      json: async () => ({ error_code: 'ALGO' }),
    });
    await mandaElCierrePendiente();
    expect(hayCierrePendiente()).toBe(false);
  });

  it('revisión: un refresco con 429 deja la marca', async () => {
    apuntaElCierrePendiente();
    fetch
      .mockResolvedValueOnce(respuesta(401))
      .mockResolvedValueOnce(respuesta(429));
    await expect(mandaElCierrePendiente()).rejects.toBeInstanceOf(TypeError);
    expect(llamadasA(URL_DEL_CIERRE)).toHaveLength(1);
    expect(hayCierrePendiente()).toBe(true);
  });

  it('revisión: el refresco va bien y el cierre sigue en 401: la marca sigue', async () => {
    apuntaElCierrePendiente();
    fetch
      .mockResolvedValueOnce(respuesta(401))
      .mockResolvedValueOnce(respuesta(200))
      .mockResolvedValueOnce(respuesta(401));
    await expect(mandaElCierrePendiente()).rejects.toBeInstanceOf(TypeError);
    expect(hayCierrePendiente()).toBe(true);
  });

  it('revisión: si otra pestaña resolvió la marca mientras tanto, no se refresca', async () => {
    apuntaElCierrePendiente();
    fetch.mockImplementationOnce(async () => {
      // Otra pestaña cerró y entró con una sesión nueva durante este 401
      olvidaElCierrePendiente();
      return respuesta(401);
    });
    await mandaElCierrePendiente();
    expect(llamadasA(URL_DEL_REFRESCO)).toHaveLength(0);
  });

  it('revisión: entre pestañas, un cierre a la vez (candado del navegador)', async () => {
    const pedidos = [];
    vi.stubGlobal('navigator', {
      locks: {
        request: vi.fn(async (nombre, fn) => {
          pedidos.push(nombre);
          return fn();
        }),
      },
    });
    apuntaElCierrePendiente();
    fetch.mockResolvedValueOnce(respuesta(200));
    await mandaElCierrePendiente();
    expect(pedidos).toEqual(['rydercup-cierre-pendiente']);
    expect(hayCierrePendiente()).toBe(false);
  });

  it('una marca de más de 7 días se olvida sin llamar: la sesión ya no puede vivir', async () => {
    almacen.set(
      'rydercup-cierre-pendiente',
      String(Date.now() - 8 * 24 * 60 * 60 * 1000),
    );
    await mandaElCierrePendiente();
    expect(fetch).not.toHaveBeenCalled();
    expect(hayCierrePendiente()).toBe(false);
  });

  it('dos a la vez mandan un solo cierre', async () => {
    apuntaElCierrePendiente();
    let suelta;
    fetch.mockImplementationOnce(
      () => new Promise((resuelve) => (suelta = resuelve)),
    );
    const a = mandaElCierrePendiente();
    const b = mandaElCierrePendiente();
    suelta(respuesta(200));
    await Promise.all([a, b]);
    expect(llamadasA(URL_DEL_CIERRE)).toHaveLength(1);
  });
});

describe('esperar al cierre pendiente antes de una petición', () => {
  it('sin marca no espera ni manda nada', async () => {
    await esperaAlCierrePendiente();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('E2/E6: con la marca, primero el cierre', async () => {
    apuntaElCierrePendiente();
    fetch.mockResolvedValueOnce(respuesta(200));
    await esperaAlCierrePendiente();
    expect(llamadasA(URL_DEL_CIERRE)).toHaveLength(1);
    expect(hayCierrePendiente()).toBe(false);
  });

  it('E2: sin red falla como «sin conexión» y la marca sigue', async () => {
    apuntaElCierrePendiente();
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(esperaAlCierrePendiente()).rejects.toBeInstanceOf(TypeError);
    expect(hayCierrePendiente()).toBe(true);
  });
});
