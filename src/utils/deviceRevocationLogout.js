/**
 * Device Revocation Logout Utility
 * Centralized function for handling device revocation (HTTP 401)
 *
 * When a device is revoked from another browser/device, the backend returns
 * HTTP 401 with detail: "Dispositivo revocado. Por favor, inicia sesión nuevamente."
 *
 * This utility:
 * - Detects device revocation from backend response (EXPLICIT revocation only)
 * - Detects session expiration (refresh token expired - separate from revocation)
 * - Clears authentication state (localStorage + Sentry)
 * - Shows user-friendly toast with i18n message
 * - Redirects to login page
 *
 * IMPORTANT: v2.0.4 refactor - Separated device revocation from session expiration
 * - isDeviceRevoked() now returns true ONLY for explicit device revocation
 * - isSessionExpired() handles refresh token expiration
 * - Different messages and icons for each scenario
 *
 * @see src/config/dependencies.py:576-583 (backend)
 */

import i18next from 'i18next';
import customToast from './toast';

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
 * Check if a response indicates EXPLICIT device revocation
 *
 * IMPORTANT: This function should ONLY return true for explicit device revocation,
 * NOT for session expiration or invalid tokens. This prevents confusing users
 * with "device revoked" messages when their session simply expired.
 *
 * @param {Object} response - Fetch response object
 * @param {Object} errorData - Parsed error data from response
 * @returns {boolean} - True ONLY if device was explicitly revoked
 */
export const isDeviceRevoked = (response, errorData = {}) => {
  // Check for 401 status + specific revocation message from backend
  if (response?.status === 401 && errorData?.detail) {
    const detail = String(errorData.detail).toLowerCase();

    // ONLY explicit revocation messages
    // Backend sends: "Dispositivo revocado. Por favor, inicia sesión nuevamente."
    // or English: "Device revoked. Please sign in again."
    if (detail.includes('dispositivo revocado') || detail.includes('device revoked')) {
      return true;
    }
  }
  return false;
};

/**
 * Check if a response indicates session expiration (refresh token expired/invalid)
 *
 * This is SEPARATE from device revocation. Session expiration happens when:
 * - Refresh token has expired (after 7 days of inactivity)
 * - Refresh token is invalid for some reason
 *
 * @param {Object} response - Fetch response object
 * @param {Object} errorData - Parsed error data from response
 * @returns {boolean} - True if session expired (but NOT device revoked)
 */
export const isSessionExpired = (response, errorData = {}) => {
  // First, ensure it's not a device revocation
  if (isDeviceRevoked(response, errorData)) {
    return false;
  }

  // Check for 401 status + refresh token error messages
  if (response?.status === 401 && errorData?.detail) {
    const detail = String(errorData.detail).toLowerCase();

    // Refresh token expired or invalid
    if (detail.includes('refresh token inválido o expirado') ||
        detail.includes('refresh token invalid or expired')) {
      return true;
    }

    // Generic refresh token errors
    if (detail.includes('refresh token') &&
        (detail.includes('inválido') || detail.includes('invalid') ||
         detail.includes('expirado') || detail.includes('expired'))) {
      return true;
    }
  }
  return false;
};

/**
 * Check if a response requires re-authentication (either revocation or expiration)
 *
 * Use this when you need to know if the user needs to log in again,
 * regardless of the reason.
 *
 * @param {Object} response - Fetch response object
 * @param {Object} errorData - Parsed error data from response
 * @returns {boolean} - True if re-authentication is required
 */
export const requiresReAuthentication = (response, errorData = {}) => {
  return isDeviceRevoked(response, errorData) || isSessionExpired(response, errorData);
};

/**
 * Handle device revocation logout
 * Shows specific message for device revocation
 *
 * @param {Object} errorData - Optional error data
 */
export const handleDeviceRevocationLogout = (errorData = null) => {
  handleLogout(errorData, 'revocation');
};

/**
 * Handle session expiration logout
 * Shows specific message for session expiration
 *
 * @param {Object} errorData - Optional error data
 */
export const handleSessionExpiredLogout = (errorData = null) => {
  handleLogout(errorData, 'expiration');
};

/**
 * Internal function to handle logout with different reasons
 *
 * @param {Object} errorData - Optional error data to determine logout reason
 * @param {string} reason - 'revocation' | 'expiration' | 'unknown'
 */
const handleLogout = (errorData = null, reason = 'unknown') => {
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

  // Determine reason if not explicitly provided
  if (reason === 'unknown' && errorData?.detail) {
    const detail = String(errorData.detail).toLowerCase();
    if (detail.includes('revocado') || detail.includes('revoked')) {
      reason = 'revocation';
    } else if (detail.includes('expirado') || detail.includes('expired') ||
               detail.includes('inválido') || detail.includes('invalid')) {
      reason = 'expiration';
    }
  }

  // Choose message and icon based on reason using i18n
  let messageKey;
  let icon;

  if (reason === 'revocation') {
    messageKey = 'errors.deviceRevoked';
    icon = '🔒';
  } else if (reason === 'expiration') {
    messageKey = 'errors.sessionExpired';
    icon = '⏱️';
  } else {
    messageKey = 'errors.sessionEnded';
    icon = 'ℹ️';
  }

  const message = i18next.t(messageKey, { ns: 'auth' });

  customToast.error(message, {
    duration: 8000,
    icon,
  });

  // Redirect to login after a short delay (allow toast to be visible)
  setTimeout(() => {
    window.location.href = '/login';
  }, 500);
};
