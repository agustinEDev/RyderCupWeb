import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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

describe('useInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    setUserAgent(IOS_UA);
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
});
