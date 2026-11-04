/**
 * El refresco proactivo va por el refresco COMPARTIDO (hotfix 2.63.1).
 *
 * Llamaba a `refreshAccessToken()` directamente, por fuera de
 * `refrescoCompartido()`, que es lo que usan el interceptor y la sonda de
 * sesión. Si coincidía con otro salían dos POST a `/auth/refresh-token`
 * (en el Kind, a 34 ms). Cada uno rota la cookie CSRF, y la memoria podía
 * quedarse con el token de uno y la cookie con el del otro: 403 y fuera.
 *
 *   #  situación al tocarle refrescar         | POST de refresco
 *   ---|---------------------------------------|------------------------------
 *   7  ninguno en vuelo                       | uno, el compartido
 *   8  otro en vuelo (un 401, la sonda)       | ninguno más: espera a ese
 *   9  el compartido falla                    | descansa 30 s antes de otro
 *   10 el compartido va bien                  | queda anotada su hora
 *
 * Aquí el interceptor es el de verdad y lo falso es `fetch`: lo que se cuenta
 * son las peticiones que salen.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// El interceptor guarda en el módulo la hora del último refresco y el que hay
// en vuelo: cada test los carga de cero, o el anterior le deja su refresco
let useProactiveTokenRefresh;
let refrescoCompartido;
let getLastRefreshAt;
// Sin refresco previo la edad del token es desconocida y el hook mira al
// minuto de montarse (`initialLastRefresh`): ese es su primer intento
let PRIMERA;

const respuestaDelRefresco = () => ({
  ok: true,
  status: 200,
  json: async () => ({ csrf_token: 'nuevo' }),
});

const refrescos = () =>
  globalThis.fetch.mock.calls.filter(([url]) => String(url).includes('/auth/refresh-token')).length;

// Deja correr las promesas pendientes con los relojes falsos
const vacia = () => act(async () => {
  await vi.advanceTimersByTimeAsync(0);
});

describe('refresco proactivo por el compartido', () => {
  beforeEach(async () => {
    vi.resetModules();
    const hook = await import('./useProactiveTokenRefresh');
    useProactiveTokenRefresh = hook.default;
    PRIMERA = hook.REFRESH_BEFORE_MS;
    ({ refrescoCompartido, getLastRefreshAt } = await import('../utils/tokenRefreshInterceptor'));
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('7: sin otro en vuelo, sale un solo POST', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuestaDelRefresco()));
    renderHook(() => useProactiveTokenRefresh({ enabled: true }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRIMERA);
    });

    expect(refrescos()).toBe(1);
  });

  it('8: con otro en vuelo, espera a ese y no sale un segundo POST', async () => {
    let suelta;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resuelve) => {
            suelta = () => resuelve(respuestaDelRefresco());
          })
      )
    );
    renderHook(() => useProactiveTokenRefresh({ enabled: true }));

    // Justo antes de que le toque al proactivo, otro (un 401) empieza el suyo
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRIMERA - 10);
    });
    const otro = refrescoCompartido();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });

    expect(refrescos()).toBe(1);

    suelta();
    await act(async () => {
      await otro;
    });
    await vacia();

    expect(refrescos()).toBe(1);
  });

  it('9: si el compartido falla, descansa 30 s antes de volver a intentarlo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, statusText: 'x', json: async () => ({}) })));
    renderHook(() => useProactiveTokenRefresh({ enabled: true }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRIMERA);
    });
    expect(refrescos()).toBe(1);

    // Actividad a los 10 s: aún en el descanso
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
      document.dispatchEvent(new globalThis.Event('click'));
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(refrescos()).toBe(1);

    // Pasados los 30 s, la actividad sí lo intenta otra vez
    await act(async () => {
      await vi.advanceTimersByTimeAsync(25000);
      document.dispatchEvent(new globalThis.Event('click'));
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(refrescos()).toBe(2);
  });

  it('10: si va bien, queda anotada su hora', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respuestaDelRefresco()));
    renderHook(() => useProactiveTokenRefresh({ enabled: true }));
    expect(getLastRefreshAt()).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRIMERA);
    });

    expect(getLastRefreshAt()).toBe(Date.now());
  });
});
