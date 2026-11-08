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

import { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } from './avisoDeCierreForzado';
import { empiezaElCierreDeEstaCarga } from './cierreDeEstaCarga';
import { limpiaLaCuenta } from './deviceRevocationLogout';
import { redirigeAlLogin, ultimaCuentaDeEstaPestana } from './vueltaTrasEntrar';

/**
 * Handle CSRF validation failure
 *
 * Los caminos del cierre forzado (tabla aprobada por Agustín el 8 nov 2026, punto 3a):
 * - S1 un cierre por carga, venga de donde venga: si ya hay uno (otro CSRF, o un
 *   dispositivo revocado), nada
 * - S2 aviso a Sentry, la cuenta fuera (también el usuario de Sentry) y la redirección en
 *   `finally`: si una limpieza falla, se llega igual al login, y el fallo no sale de aquí
 * - S3 la misma limpieza que el dispositivo revocado; sin toast ni marca, como antes
 *
 * @param {Object} errorData - Error data from backend (optional)
 */
export const handleCsrfLogout = (errorData = {}, contexto = {}) => {
  if (!empiezaElCierreDeEstaCarga()) return;
  // Quién estaba dentro, antes de limpiar: la página se guarda con su cuenta (3b)
  const cuenta = ultimaCuentaDeEstaPestana();

  try {
    // Que se vea en Sentry (FE #1042), con la ruta que no se pudo recuperar. Antes de
    // limpiar, que quita el usuario de Sentry; no lanza
    avisaDelCierreForzado({ motivo: MOTIVO_DEL_CIERRE.CSRF_SIN_RECUPERAR, ...contexto });

    if (import.meta.env.DEV) {
      console.error('🔒 [CSRF] Validation failed:', errorData?.detail || 'No details provided');
      console.warn('🚪 [CSRF] Forcing logout and redirect to login');
    }

    // Las cookies httpOnly las sustituye el siguiente login; lo de la cuenta en el
    // dispositivo se va aquí: una redirección no vacía el almacenamiento
    limpiaLaCuenta();
  } catch (error) {
    // No sale de aquí (revisión, 8 nov 2026): quien llama lanza después el error MARCADO
    // de CSRF, el que la cola de anotaciones reconoce como de toda la sesión (FE #521);
    // con este, cada golpe de la cola lo tomaría por un fallo suyo
    console.error('[CSRF] Logout cleanup failed:', error);
  } finally {
    // This is intentional - CSRF failures require a complete app reset. Con la página
    // guardada y su cuenta, para volver a ella tras entrar
    redirigeAlLogin({ cuenta });
  }
};
