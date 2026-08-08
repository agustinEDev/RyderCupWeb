import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from './useInstallPrompt';

const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/150.0.7871.51 Mobile/15E148 Safari/604.1';

// Node's experimental global `localStorage` shadows jsdom's — mock explicitly (see AuthContext.test.jsx)
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function setUserAgent(ua) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
}

function setStandalone(value) {
  Object.defineProperty(window.navigator, 'standalone', { value, configurable: true });
}

describe('useInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    setUserAgent(IOS_UA);
    setStandalone(undefined);
  });

  it('detects iOS platform even when the banner was previously dismissed', () => {
    localStorage.setItem('pwa_install_dismissed', String(Date.now()));

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isIOS).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });

  it('detects iOS platform and allows install prompt when not dismissed', () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isIOS).toBe(true);
    expect(result.current.canInstall).toBe(true);
  });

  it('reports isInstalled and not isIOS when running standalone on iOS', () => {
    setStandalone(true);

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isIOS).toBe(false);
    expect(result.current.canInstall).toBe(false);
  });

  it('reports isInstalled via display-mode media query on non-iOS browsers', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    window.matchMedia = (query) => ({ matches: query === '(display-mode: standalone)' });

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isInstalled).toBe(true);
  });

  it('sets isInstalled when the appinstalled event fires in the current tab', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
    window.matchMedia = () => ({ matches: false });

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isInstalled).toBe(false);

    act(() => {
      window.dispatchEvent(new window.Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.canInstall).toBe(false);
  });
});

/**
 * Ruta de instalacion en iOS (FE #332).
 *
 * No hay forma programatica de instalar en iOS, asi que las instrucciones son
 * lo unico que hay — y el sitio del boton cambia con el navegador y el aparato.
 */
describe('useInstallPrompt iOS install route', () => {
  const SAFARI_IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
  const SAFARI_IPAD =
    'Mozilla/5.0 (iPad; CPU OS 26_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
  const CHROME_IOS =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/150.0.7871.51 Mobile/15E148 Safari/604.1';
  const FIREFOX_IOS =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/140.0 Mobile/15E148 Safari/605.1.15';
  const EDGE_IOS =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 26_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/140.0 Mobile/15E148 Safari/605.1.15';

  beforeEach(() => {
    localStorage.clear();
    setStandalone(undefined);
  });

  it('points to the bottom bar in Safari on iPhone', () => {
    setUserAgent(SAFARI_IPHONE);

    expect(renderHook(() => useInstallPrompt()).result.current.iosInstallRoute).toBe('safari-iphone');
  });

  it('points to the top bar in Safari on iPad', () => {
    setUserAgent(SAFARI_IPAD);

    expect(renderHook(() => useInstallPrompt()).result.current.iosInstallRoute).toBe('safari-ipad');
  });

  it.each([
    ['Chrome', CHROME_IOS],
    ['Firefox', FIREFOX_IOS],
    ['Edge', EDGE_IOS],
  ])('does not claim a position for %s on iOS', (_name, ua) => {
    // Todos arrastran "Safari" en el UA por ser WebKit: reconocerlos por su
    // propio token es lo unico que los distingue
    setUserAgent(ua);

    expect(renderHook(() => useInstallPrompt()).result.current.iosInstallRoute).toBe('other-browser');
  });

  it('still treats every iOS browser as installable', () => {
    // La ruta cambia el texto, no si se ofrece instalar
    setUserAgent(CHROME_IOS);

    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isIOS).toBe(true);
    expect(result.current.canInstall).toBe(true);
  });
  it('keeps an iPhone on iPhone instructions even if platform reports MacIntel', () => {
    // Encontrado probando en navegador: la regla de iPadOS-como-MacIntel se
    // imponia sobre un UA que decia iPhone, y mandaba al usuario a buscar el
    // boton en la barra de arriba, donde no esta
    setUserAgent(SAFARI_IPHONE);
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });

    expect(renderHook(() => useInstallPrompt()).result.current.iosInstallRoute).toBe('safari-iphone');
  });
});
