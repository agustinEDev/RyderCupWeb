/**
 * Unit tests for Device Revocation Logout utilities
 * v2.0.1: Updated tests for separated revocation vs expiration handling
 * @see deviceRevocationLogout.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isDeviceRevoked,
  isSessionExpired,
  requiresReAuthentication,
  handleDeviceRevocationLogout,
  handleSessionExpiredLogout,
  clearDeviceRevocationFlag,
} from './deviceRevocationLogout';
import customToast from './toast';

// Mock customToast
vi.mock('./toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('deviceRevocationLogout utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.href
    delete window.location;
    window.location = { href: '', pathname: '' };
    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    // Mock Sentry
    window.Sentry = { setUser: vi.fn() };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ============================================
  // isDeviceRevoked - ONLY explicit revocation
  // ============================================
  describe('isDeviceRevoked', () => {
    it('should return true when response is 401 with Spanish device revoked message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Dispositivo revocado. Por favor, inicia sesión nuevamente.' };

      expect(isDeviceRevoked(response, errorData)).toBe(true);
    });

    it('should return true when response is 401 with English device revoked message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Device revoked. Please sign in again.' };

      expect(isDeviceRevoked(response, errorData)).toBe(true);
    });

    it('should return true when detail contains "dispositivo revocado" in mixed case', () => {
      const response = { status: 401 };
      const errorData = { detail: 'El Dispositivo Revocado por seguridad' };

      expect(isDeviceRevoked(response, errorData)).toBe(true);
    });

    // v2.0.1: Refresh token errors are now handled by isSessionExpired, NOT isDeviceRevoked
    it('should return false when response has refresh token expired message (handled by isSessionExpired)', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.' };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when response has English refresh token expired message (handled by isSessionExpired)', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token invalid or expired. Please sign in again.' };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when response is 401 with access token error', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Access token inválido o expirado' };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when response is 401 but detail does not mention revocation', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Credenciales inválidas' };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when response is not 401', () => {
      const response = { status: 403 };
      const errorData = { detail: 'Dispositivo revocado' };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when errorData is empty', () => {
      const response = { status: 401 };
      const errorData = {};

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when errorData.detail is null', () => {
      const response = { status: 401 };
      const errorData = { detail: null };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });
  });

  // ============================================
  // isSessionExpired - refresh token expired/invalid
  // ============================================
  describe('isSessionExpired', () => {
    it('should return true when response has Spanish refresh token expired message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.' };

      expect(isSessionExpired(response, errorData)).toBe(true);
    });

    it('should return true when response has English refresh token expired message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token invalid or expired. Please sign in again.' };

      expect(isSessionExpired(response, errorData)).toBe(true);
    });

    it('should return true when response has generic refresh token invalid message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'El refresh token es inválido' };

      expect(isSessionExpired(response, errorData)).toBe(true);
    });

    it('should return true when response has generic refresh token expired message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token has expired' };

      expect(isSessionExpired(response, errorData)).toBe(true);
    });

    it('should return false when response has device revoked message (handled by isDeviceRevoked)', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Dispositivo revocado. Por favor, inicia sesión nuevamente.' };

      expect(isSessionExpired(response, errorData)).toBe(false);
    });

    it('should return false when response is 401 with access token error', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Access token inválido o expirado' };

      expect(isSessionExpired(response, errorData)).toBe(false);
    });

    it('should return false when response is not 401', () => {
      const response = { status: 403 };
      const errorData = { detail: 'Refresh token expired' };

      expect(isSessionExpired(response, errorData)).toBe(false);
    });
  });

  // ============================================
  // requiresReAuthentication - combined check
  // ============================================
  describe('requiresReAuthentication', () => {
    it('should return true for device revocation', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Dispositivo revocado' };

      expect(requiresReAuthentication(response, errorData)).toBe(true);
    });

    it('should return true for session expiration', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token expired' };

      expect(requiresReAuthentication(response, errorData)).toBe(true);
    });

    it('should return false for other 401 errors', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Invalid credentials' };

      expect(requiresReAuthentication(response, errorData)).toBe(false);
    });
  });

  // ============================================
  // handleDeviceRevocationLogout - always shows revocation message
  // ============================================
  describe('handleDeviceRevocationLogout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should clear localStorage user data', () => {
      handleDeviceRevocationLogout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
    });

    it('should clear Sentry user context', () => {
      handleDeviceRevocationLogout();

      expect(window.Sentry.setUser).toHaveBeenCalledWith(null);
    });

    it('should show revocation message with 🔒 icon (always for this handler)', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'en';
        return null;
      });

      handleDeviceRevocationLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        'Your session has been closed. This device was revoked from another device.',
        expect.objectContaining({ duration: 8000, icon: '🔒' })
      );
    });

    it('should redirect to /login after 500ms delay', () => {
      handleDeviceRevocationLogout();

      expect(window.location.href).toBe('');

      vi.advanceTimersByTime(500);

      expect(window.location.href).toBe('/login');
    });

    it('should not crash if Sentry is not initialized', () => {
      window.Sentry = undefined;

      expect(() => handleDeviceRevocationLogout()).not.toThrow();
      expect(localStorage.removeItem).toHaveBeenCalled();
    });

    it('should use Spanish revocation message when language is Spanish', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'es';
        return null;
      });

      handleDeviceRevocationLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        'Tu sesión ha sido cerrada. Este dispositivo fue revocado desde otro dispositivo.',
        expect.objectContaining({ duration: 8000, icon: '🔒' })
      );
    });
  });

  // ============================================
  // handleSessionExpiredLogout - always shows expiration message
  // ============================================
  describe('handleSessionExpiredLogout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should clear localStorage user data', () => {
      handleSessionExpiredLogout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
    });

    it('should show expiration message with ⏱️ icon (always for this handler)', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'en';
        return null;
      });

      handleSessionExpiredLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        'Your session has expired. Please sign in again.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should redirect to /login after 500ms delay', () => {
      handleSessionExpiredLogout();

      expect(window.location.href).toBe('');

      vi.advanceTimersByTime(500);

      expect(window.location.href).toBe('/login');
    });

    it('should use Spanish expiration message when language is Spanish', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'es';
        return null;
      });

      handleSessionExpiredLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });
  });

  // ============================================
  // i18n Language Detection
  // ============================================
  describe('i18n Language Detection', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      Object.defineProperty(window.navigator, 'language', {
        writable: true,
        configurable: true,
        value: 'en-US',
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should use Spanish when i18nextLng is "es" in localStorage', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'es';
        return null;
      });

      handleSessionExpiredLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should use English when i18nextLng is "en" in localStorage', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'en';
        return null;
      });

      handleSessionExpiredLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        'Your session has expired. Please sign in again.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should fallback to navigator.language when i18nextLng is not in localStorage', () => {
      localStorage.getItem.mockReturnValue(null);
      window.navigator.language = 'es-ES';

      handleSessionExpiredLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should prioritize i18nextLng over navigator.language', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'es';
        return null;
      });
      window.navigator.language = 'en-US';

      handleSessionExpiredLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should use English as fallback when both i18nextLng and navigator.language are null', () => {
      localStorage.getItem.mockReturnValue(null);
      Object.defineProperty(window.navigator, 'language', {
        writable: true,
        configurable: true,
        value: undefined,
      });

      handleSessionExpiredLogout();

      expect(customToast.error).toHaveBeenCalledWith(
        'Your session has expired. Please sign in again.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });
  });

  // ============================================
  // clearDeviceRevocationFlag
  // ============================================
  describe('clearDeviceRevocationFlag', () => {
    it('should remove the revocation handled flag from localStorage', () => {
      clearDeviceRevocationFlag();

      expect(localStorage.removeItem).toHaveBeenCalledWith('device_revocation_handled');
    });
  });

  // ============================================
  // Idempotency - prevent multiple logouts
  // ============================================
  describe('Idempotency', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should not show toast if already handled and on login page', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'device_revocation_handled') return 'true';
        return null;
      });
      window.location.pathname = '/login';

      handleDeviceRevocationLogout();

      expect(customToast.error).not.toHaveBeenCalled();
    });

    it('should redirect without toast if already handled but not on login page', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'device_revocation_handled') return 'true';
        return null;
      });
      window.location.pathname = '/dashboard';

      handleDeviceRevocationLogout();

      expect(customToast.error).not.toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    });
  });
});
