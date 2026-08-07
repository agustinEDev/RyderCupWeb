import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStandalone, detectStandalone } from './useStandalone';

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
    setNavigatorStandalone(true);

    const { result } = renderHook(() => useStandalone());

    expect(result.current).toBe(true);
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
