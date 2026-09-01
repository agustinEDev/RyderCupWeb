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
import { idDeLaCuentaGuardada } from './auth';
import * as golpesPerdidos from './golpesPerdidos';

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
  const quienEra = idDeLaCuentaGuardada();
  localStorage.removeItem('user');
  localStorage.removeItem('access_token'); // Legacy cleanup
  // Y las partidas guardadas para anotar sin cobertura (FE #524). Es el cuarto
  // camino de salida, y como el del dispositivo revocado tampoco pasa por
  // `clearAuth`: sin esto, tras un fallo de CSRF en un móvil compartido la
  // siguiente persona que se quedara sin señal vería las partidas de la anterior
  olvidaLoDeEstaCuenta();
  // Y los avisos de golpes que el servidor rechazó (FE #521). Este camino
  // tampoco pasa por `clearAuth`, y una redirección dura no vacía el
  // almacenamiento: sin esto, los avisos de esta cuenta se quedan aquí para
  // que los lea quien entre después, que no puede hacer nada con ellos
  golpesPerdidos.olvidaLosDeLaCuenta(quienEra);

  // Hard redirect to login page
  // This is intentional - CSRF failures require a complete app reset
  window.location.href = '/login';
};
