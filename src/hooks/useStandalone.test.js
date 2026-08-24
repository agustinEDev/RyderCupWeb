import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStandalone, detectStandalone } from './useStandalone';

// `navigator.standalone` solo existe en iOS, asi que ponerlo a true sin un iOS
// detras describe un aparato que no existe. La deteccion mira el userAgent para
// no fiarse de `display-mode` en los navegadores de iOS basados en WebView.
function setUserAgent(value) {
  Object.defineProperty(window.navigator, 'userAgent', {
    value,
    configurable: true,
    writable: true,
  });
}

function setNavigatorStandalone(value) {
  Object.defineProperty(window.navigator, 'standalone', { value, configurable: true });
}

/**
 * Instala un `matchMedia` controlable: devuelve `matches` para
 * `display-mode: standalone` y permite disparar el evento `change` a mano,
 * que es como el navegador avisa de que la pestana ha pasado a instalada.
 */
function mockMatchMedia(matches) {
  const listeners = new Set();
  const query = {
    matches,
    addEventListener: (_event, handler) => listeners.add(handler),
    removeEventListener: (_event, handler) => listeners.delete(handler),
  };

  window.matchMedia = vi.fn(() => query);

  return {
    emitChange(next) {
      query.matches = next;
      listeners.forEach((handler) => handler({ matches: next }));
    },
    listenerCount: () => listeners.size,
  };
}

describe('useStandalone', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Se restaura por prueba: `defineProperty` persiste entre ellas, y un
    // userAgent de iPhone colado deja la deteccion mirando solo
    // `navigator.standalone` en las que vienen detras
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/140.0');
    setNavigatorStandalone(undefined);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('reports a browser tab as not standalone', () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useStandalone());

    expect(result.current).toBe(false);
  });

  it('detects standalone through the display-mode media query', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useStandalone());

    expect(result.current).toBe(true);
  });

  it('detects standalone on iOS, which does not implement display-mode', () => {
    mockMatchMedia(false);
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15');
    setNavigatorStandalone(true);

    const { result } = renderHook(() => useStandalone());

    expect(result.current).toBe(true);
  });

  it('detecta la aplicacion instalada en Android por display-mode', () => {
    // Fuera de iOS manda `display-mode`, que Android implementa bien y es lo
    // que declara el manifiesto (`display: 'standalone'`)
    mockMatchMedia(true);
    setUserAgent('Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140.0 Mobile');

    const { result } = renderHook(() => useStandalone());

    expect(result.current).toBe(true);
  });

  it('no toma por instalada una pestana normal de Android', () => {
    mockMatchMedia(false);
    setUserAgent('Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140.0 Mobile');

    const { result } = renderHook(() => useStandalone());

    expect(result.current).toBe(false);
  });

  it('no toma por instalada una pestana de Chrome en iOS', () => {
    // Chrome en iOS va sobre WebView y dice que si a `display-mode: standalone`
    // estando en una pestana normal: con el OR de antes, cualquiera que abriera
    // ahi la portada con sesion acababa rebotado al panel sin poder verla.
    mockMatchMedia(true);
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) CriOS/140.0');
    setNavigatorStandalone(false);

    const { result } = renderHook(() => useStandalone());

    expect(result.current).toBe(false);
  });

  it('no toma por instalada la vista incrustada de otra aplicacion en Android', () => {
    // El navegador de Instagram va sobre WebView y no pinta barra: dice que si a
    // `display-mode: standalone` sin ser la aplicacion instalada. Quien abriera
    // ahi el enlace con sesion se quedaria sin ver la portada.
    mockMatchMedia(true);
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 15; Pixel 9; wv) Chrome/140.0 Mobile Instagram 350.0'
    );

    const { result } = renderHook(() => useStandalone());

    expect(result.current).toBe(false);
  });

  it('reacts when the tab becomes installed without reloading', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useStandalone());

    expect(result.current).toBe(false);

    act(() => media.emitChange(true));

    expect(result.current).toBe(true);
  });

  it('drops its listener on unmount', () => {
    const media = mockMatchMedia(false);
    const { unmount } = renderHook(() => useStandalone());

    expect(media.listenerCount()).toBe(1);
    unmount();

    expect(media.listenerCount()).toBe(0);
  });

  it('survives an environment without matchMedia', () => {
    window.matchMedia = undefined;

    expect(() => detectStandalone()).not.toThrow();
    expect(detectStandalone()).toBe(false);
  });
});
