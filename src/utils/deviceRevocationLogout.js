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
import i18n from '../i18n/config';

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
    return detail.includes('dispositivo revocado') || detail.includes('device revoked');
  }
  return false;
};

/**
 * Handle device revocation logout
 * - Clears localStorage (user data)
 * - Clears Sentry user context
 * - Shows translated toast message
 * - Redirects to login page
 *
 * @param {Object} errorData - Error data from backend (optional, for logging)
 */
export const handleDeviceRevocationLogout = (errorData = {}) => {
  if (import.meta.env.DEV) {
    console.warn('🚫 [DeviceRevocation] Device has been revoked');
    console.log('🚫 [DeviceRevocation] Backend message:', errorData.detail || 'No details');
  }

  // Clear localStorage
  localStorage.removeItem('user');
  localStorage.removeItem('access_token'); // Legacy cleanup

  // Clear Sentry user context (if Sentry is initialized)
  if (window.Sentry && typeof window.Sentry.setUser === 'function') {
    window.Sentry.setUser(null);
  }

  // Show user-friendly toast with i18n message
  // Duration: 8 seconds (long enough to read)
  // Fallback to English if i18n is not ready
  let message;
  try {
    message = i18n.t('errors.deviceRevoked', { ns: 'auth' });
  } catch (error) {
    console.warn('[DeviceRevocation] i18n not ready, using fallback message');
    message = 'Your session has been closed. This device was revoked from another device.';
  }

  toast.error(message, {
    duration: 8000,
    icon: '🔒',
  });

  // Redirect to login after a short delay (allow toast to be visible)
  setTimeout(() => {
    window.location.href = '/login';
  }, 500);
};
