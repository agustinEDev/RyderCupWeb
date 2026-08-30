/**
 * CSRF Logout Utility
 * Centralized function for handling CSRF validation failures
 *
 * NOTE: Uses hard redirect (window.location.href) instead of React Router navigate()
 * because CSRF failures indicate a critical security issue that requires a full
 * page reload to reset all application state, clear any stale tokens, and ensure
 * the user starts with a clean session.
 *
 * @see docs/FRONTEND_INTEGRATION_v1.13.0.md - CSRF Protection section
 */

import { olvidaLoDeEstaCuenta } from '../services/loUltimoConocido';

/**
 * Handle CSRF validation failure
 * - Clears authentication state from localStorage
 * - Performs a hard redirect to login page
 * - Logs error in development mode
 *
 * @param {Object} errorData - Error data from backend (optional)
 */
export const handleCsrfLogout = (errorData = {}) => {
  if (import.meta.env.DEV) {
    console.error('🔒 [CSRF] Validation failed:', errorData.detail || 'No details provided');
    console.warn('🚪 [CSRF] Forcing logout and redirect to login');
  }

  // Clear auth state (legacy localStorage cleanup)
  // NOTE: httpOnly cookies are managed by the browser and will be cleared on next login
  localStorage.removeItem('user');
  localStorage.removeItem('access_token'); // Legacy cleanup
  // Y las partidas guardadas para anotar sin cobertura (FE #524). Es el cuarto
  // camino de salida, y como el del dispositivo revocado tampoco pasa por
  // `clearAuth`: sin esto, tras un fallo de CSRF en un móvil compartido la
  // siguiente persona que se quedara sin señal vería las partidas de la anterior
  olvidaLoDeEstaCuenta();

  // Hard redirect to login page
  // This is intentional - CSRF failures require a complete app reset
  window.location.href = '/login';
};
