/**
 * Device Revocation Logout Utility
 * Centralized function for handling device revocation (HTTP 401)
 *
 * When a device is revoked from another browser/device, the backend returns
 * HTTP 401 with detail: "Dispositivo revocado. Por favor, inicia sesión nuevamente."
 *
 * This utility:
 * - Detects device revocation from backend response
 * - Clears authentication state (localStorage + Sentry)
 * - Shows user-friendly toast with i18n message
 * - Redirects to login page
 *
 * @see src/config/dependencies.py:576-583 (backend)
 */

import toast from 'react-hot-toast';

// localStorage key to track if we've already handled device revocation
const REVOCATION_HANDLED_KEY = 'device_revocation_handled';

/**
 * Clear the device revocation handled flag
 * Should be called when user successfully authenticates
 */
export const clearDeviceRevocationFlag = () => {
  localStorage.removeItem(REVOCATION_HANDLED_KEY);
};

/**
 * Check if a response indicates device revocation
 * @param {Object} response - Fetch response object
 * @param {Object} errorData - Parsed error data from response
 * @returns {boolean} - True if device was revoked
 */
export const isDeviceRevoked = (response, errorData = {}) => {
  // Check for 401 status + specific message from backend
  if (response?.status === 401 && errorData?.detail) {
    const detail = String(errorData.detail).toLowerCase();

    // Scenario 1: Direct revocation (backend returns explicit message)
    if (detail.includes('dispositivo revocado') || detail.includes('device revoked')) {
      return true;
    }

    // Scenario 2: Refresh token revocation (indirect detection)
    // Backend returns this message when refresh token was revoked from another device
    // OR when refresh token expired naturally (both require re-login)
    if (detail.includes('refresh token inválido o expirado') ||
        detail.includes('refresh token invalid or expired')) {
      return true;
    }

    // Fallback: Generic "refresh token" error message
    if (detail.includes('refresh token') &&
        (detail.includes('inválido') || detail.includes('invalid') ||
         detail.includes('expirado') || detail.includes('expired'))) {
      return true;
    }
  }
  return false;
};

/**
 * Handle device revocation logout
 * - Clears localStorage (user data)
 * - Clears Sentry user context
 * - Shows translated toast message
 * - Redirects to login page
 */
export const handleDeviceRevocationLogout = () => {
  const alreadyHandled = localStorage.getItem(REVOCATION_HANDLED_KEY);

  // If already on login page and already handled, do nothing
  if (alreadyHandled && window.location.pathname === '/login') {
    return;
  }

  // If already handled but not on login, just redirect (no toast to avoid spam)
  if (alreadyHandled) {
    window.location.href = '/login';
    return;
  }

  // First time handling - do full logout flow
  localStorage.setItem(REVOCATION_HANDLED_KEY, 'true');

  // Clear localStorage
  localStorage.removeItem('user');
  localStorage.removeItem('access_token'); // Legacy cleanup

  // Clear Sentry user context (if Sentry is initialized)
  if (window.Sentry && typeof window.Sentry.setUser === 'function') {
    window.Sentry.setUser(null);
  }

  // Show user-friendly toast message
  // Duration: 8 seconds (long enough to read)
  // Use configured i18n language first, fallback to browser language
  const storedLang = localStorage.getItem('i18nextLng');
  const detectedLang = (storedLang || navigator.language)?.startsWith('es') ? 'es' : 'en';
  const messages = {
    es: 'Tu sesión ha sido cerrada. Este dispositivo fue revocado desde otro dispositivo.',
    en: 'Your session has been closed. This device was revoked from another device.',
  };
  const message = messages[detectedLang] || messages.en;

  toast.error(message, {
    duration: 8000,
    icon: '🔒',
  });

  // Redirect to login after a short delay (allow toast to be visible)
  setTimeout(() => {
    window.location.href = '/login';
  }, 500);
};
