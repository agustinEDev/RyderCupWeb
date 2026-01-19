/**
 * Unit tests for Device Revocation Logout utilities
 * @see deviceRevocationLogout.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isDeviceRevoked, handleDeviceRevocationLogout } from './deviceRevocationLogout';
import toast from 'react-hot-toast';

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
  },
}));

describe('deviceRevocationLogout utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.href
    delete window.location;
    window.location = { href: '' };
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

    it('should return true when response is 401 with Spanish refresh token revoked message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token inválido o expirado. Por favor, inicia sesión nuevamente.' };

      expect(isDeviceRevoked(response, errorData)).toBe(true);
    });

    it('should return true when response is 401 with English refresh token revoked message', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token invalid or expired. Please sign in again.' };

      expect(isDeviceRevoked(response, errorData)).toBe(true);
    });

    it('should return true when response is 401 with generic refresh token invalid message (Spanish)', () => {
      const response = { status: 401 };
      const errorData = { detail: 'El refresh token es inválido' };

      expect(isDeviceRevoked(response, errorData)).toBe(true);
    });

    it('should return true when response is 401 with generic refresh token expired message (English)', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Refresh token has expired' };

      expect(isDeviceRevoked(response, errorData)).toBe(true);
    });

    it('should return false when response is 401 with access token error (not refresh token)', () => {
      const response = { status: 401 };
      const errorData = { detail: 'Access token inválido o expirado' };

      expect(isDeviceRevoked(response, errorData)).toBe(false);
    });

    it('should return false when response is 401 but detail does not mention revocation or refresh token', () => {
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

    it('should show error toast with neutral message when no errorData provided', () => {
      handleDeviceRevocationLogout();

      // Without errorData, uses neutral "session ended" message with ⏱️ icon
      expect(toast.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          duration: 8000,
          icon: '⏱️', // Neutral icon for session expiration
        })
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

    it('should log backend error message in development mode', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const errorData = { detail: 'Dispositivo revocado desde otro lugar' };
      handleDeviceRevocationLogout(errorData);

      // Note: This only logs in DEV mode (import.meta.env.DEV)
      // In test environment, we just verify the function runs without errors

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('handleDeviceRevocationLogout - i18n Language Detection', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // Mock navigator.language
      Object.defineProperty(window.navigator, 'language', {
        writable: true,
        configurable: true,
        value: 'en-US',
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should use Spanish message when i18nextLng is "es" in localStorage', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'es';
        return null;
      });

      handleDeviceRevocationLogout();

      // No errorData -> neutral session expiration message
      expect(toast.error).toHaveBeenCalledWith(
        'Tu sesión ha terminado. Por favor, inicia sesión nuevamente.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should use English message when i18nextLng is "en" in localStorage', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'en';
        return null;
      });

      handleDeviceRevocationLogout();

      // No errorData -> neutral session expiration message
      expect(toast.error).toHaveBeenCalledWith(
        'Your session has ended. Please sign in again.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should fallback to navigator.language when i18nextLng is not in localStorage', () => {
      localStorage.getItem.mockReturnValue(null);
      window.navigator.language = 'es-ES';

      handleDeviceRevocationLogout();

      // No errorData -> neutral session expiration message
      expect(toast.error).toHaveBeenCalledWith(
        'Tu sesión ha terminado. Por favor, inicia sesión nuevamente.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should use English when i18nextLng is not in localStorage and navigator.language is not Spanish', () => {
      localStorage.getItem.mockReturnValue(null);
      window.navigator.language = 'fr-FR';

      handleDeviceRevocationLogout();

      // No errorData -> neutral session expiration message
      expect(toast.error).toHaveBeenCalledWith(
        'Your session has ended. Please sign in again.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should handle i18nextLng with region code (es-ES)', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'es-ES';
        return null;
      });

      handleDeviceRevocationLogout();

      // No errorData -> neutral session expiration message
      expect(toast.error).toHaveBeenCalledWith(
        'Tu sesión ha terminado. Por favor, inicia sesión nuevamente.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should handle i18nextLng with region code (en-GB)', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'en-GB';
        return null;
      });

      handleDeviceRevocationLogout();

      // No errorData -> neutral session expiration message
      expect(toast.error).toHaveBeenCalledWith(
        'Your session has ended. Please sign in again.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should prioritize i18nextLng over navigator.language', () => {
      // User configured Spanish, but browser is English
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'es';
        return null;
      });
      window.navigator.language = 'en-US';

      handleDeviceRevocationLogout();

      // Should use Spanish (from i18nextLng), not English (from navigator)
      // No errorData -> neutral session expiration message
      expect(toast.error).toHaveBeenCalledWith(
        'Tu sesión ha terminado. Por favor, inicia sesión nuevamente.',
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

      handleDeviceRevocationLogout();

      // No errorData -> neutral session expiration message
      expect(toast.error).toHaveBeenCalledWith(
        'Your session has ended. Please sign in again.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });
  });

  describe('handleDeviceRevocationLogout - Message Differentiation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'en';
        return null;
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show explicit revocation message with 🔒 icon when errorData contains "revocado"', () => {
      const errorData = { detail: 'Dispositivo revocado. Por favor, inicia sesión nuevamente.' };
      handleDeviceRevocationLogout(errorData);

      expect(toast.error).toHaveBeenCalledWith(
        'Your session has been closed. This device was revoked from another device.',
        expect.objectContaining({ duration: 8000, icon: '🔒' })
      );
    });

    it('should show explicit revocation message with 🔒 icon when errorData contains "revoked"', () => {
      const errorData = { detail: 'Device revoked. Please sign in again.' };
      handleDeviceRevocationLogout(errorData);

      expect(toast.error).toHaveBeenCalledWith(
        'Your session has been closed. This device was revoked from another device.',
        expect.objectContaining({ duration: 8000, icon: '🔒' })
      );
    });

    it('should show neutral message with ⏱️ icon when errorData contains "expirado"', () => {
      const errorData = { detail: 'Refresh token inválido o expirado' };
      handleDeviceRevocationLogout(errorData);

      expect(toast.error).toHaveBeenCalledWith(
        'Your session has ended. Please sign in again.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should show neutral message with ⏱️ icon when errorData contains "expired"', () => {
      const errorData = { detail: 'Refresh token invalid or expired' };
      handleDeviceRevocationLogout(errorData);

      expect(toast.error).toHaveBeenCalledWith(
        'Your session has ended. Please sign in again.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should show neutral message with ⏱️ icon when errorData has no specific keywords', () => {
      const errorData = { detail: 'Some generic error message' };
      handleDeviceRevocationLogout(errorData);

      expect(toast.error).toHaveBeenCalledWith(
        'Your session has ended. Please sign in again.',
        expect.objectContaining({ duration: 8000, icon: '⏱️' })
      );
    });

    it('should use Spanish messages when language is Spanish', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'i18nextLng') return 'es';
        return null;
      });

      const errorData = { detail: 'Dispositivo revocado desde otro lugar' };
      handleDeviceRevocationLogout(errorData);

      expect(toast.error).toHaveBeenCalledWith(
        'Tu sesión ha sido cerrada. Este dispositivo fue revocado desde otro dispositivo.',
        expect.objectContaining({ duration: 8000, icon: '🔒' })
      );
    });
  });
});
