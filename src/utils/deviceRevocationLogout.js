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

import { olvidaLoDeEstaCuenta } from '../services/loUltimoConocido';
import { olvidaElRefrescoDeHandicap } from '../services/refrescoDeHandicapApuntes';
import { olvidaLasNovedades } from '../services/novedadesDeActividad';
import i18next from 'i18next';
import customToast from './toast';
import { clearUserContext } from './sentryHelpers';
import { avisaDelCierreForzado, MOTIVO_DEL_CIERRE } from './avisoDeCierreForzado';
import { quienEstaDentro, redirigeAlLogin } from './vueltaTrasEntrar';

// localStorage key to track if we've already handled device revocation
const REVOCATION_HANDLED_KEY = 'device_revocation_handled';
// Quién la puso (8 nov 2026): revocar el propio dispositivo es salir a propósito
// («propia»: no se guarda la página); un cierre forzado deja «forzado». Una marca de
// antes (`'true'`) es la de un cierre: la pestaña que la encuentre hace el suyo (C4)
const MARCA_DEL_CIERRE_FORZADO = 'forzado';
const MARCA_DE_LA_REVOCACION_PROPIA = 'propia';

/** El usuario revoca su propio dispositivo desde Dispositivos: sale a propósito. */
export const marcaLaRevocacionPropia = () => {
  localStorage.setItem(REVOCATION_HANDLED_KEY, MARCA_DE_LA_REVOCACION_PROPIA);
};

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
export const handleDeviceRevocationLogout = (errorData = null, contexto = {}) => {
  handleLogout(errorData, 'revocation', { ...contexto, motivo: MOTIVO_DEL_CIERRE.DISPOSITIVO_REVOCADO });
};

/**
 * Handle session expiration logout
 * Shows specific message for session expiration
 *
 * @param {Object} errorData - Optional error data
 */
export const handleSessionExpiredLogout = (errorData = null, contexto = {}) => {
  handleLogout(errorData, 'expiration', { motivo: MOTIVO_DEL_CIERRE.SESION_CADUCADA, ...contexto });
};

// El cierre de ESTA carga de página (C1, 8 nov 2026): al recargar con la sesión muerta
// fallan dos peticiones a la vez; la primera ya guardó la página, enseñó el toast y
// sale a los 500 ms, así que la segunda no hace nada. La marca de localStorage no
// sirve para esto: la comparten las pestañas y sobrevive a la carga. Lo comparte el
// cierre por CSRF (S1): uno por carga, venga de donde venga
let cierreEnEstaCarga = false;

/**
 * Anota el cierre de esta carga. `false` si ya había uno: quien llama no hace nada (C1, S1).
 */
export const empiezaElCierreDeEstaCarga = () => {
  if (cierreEnEstaCarga) return false;
  cierreEnEstaCarga = true;
  return true;
};

/**
 * Si un cierre forzado ya está en marcha en esta carga: la redirección llega enseguida, y
 * quien pinta un fallo de la petición que lo provocó no lo enseña (3c, 8 nov 2026).
 */
export const seEstaCerrandoLaSesion = () => cierreEnEstaCarga;

/**
 * SOLO para los tests: una carga de página nueva. En el navegador lo hace la salida a
 * /login, que descarga la página; ningún código de la aplicación lo llama.
 */
export const olvidaElCierreDeEstaCarga = () => {
  cierreEnEstaCarga = false;
};

/**
 * Lo de la cuenta que sale, también al revocar el propio dispositivo (C3) y en el cierre
 * por CSRF (S3): una sola limpieza para los cierres duros.
 */
export const limpiaLaCuenta = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('access_token'); // Legacy cleanup
  // Y las partidas guardadas para anotar sin cobertura (FE #524). Este camino
  // NO pasa por `clearAuth` —sale con una redirección dura—, y una redirección
  // no vacía el almacenamiento: sin esto, quien entrara después en ese móvil
  // podría ver sin cobertura las partidas de la cuenta que acaba de revocarse
  olvidaLoDeEstaCuenta();
  // Y lo pendiente del hándicap (FE #677): el modal de la siguiente persona
  // saldría con el hándicap de esta cuenta
  olvidaElRefrescoDeHandicap();
  // Y el número de Actividad y el del icono de la aplicación (FE-1)
  olvidaLasNovedades();
  // El usuario de Sentry, por sentryHelpers: `window.Sentry` no lo asignaba
  // nadie y esta línea no hacía nada (25 oct 2026)
  clearUserContext();
};

/**
 * Internal function to handle logout with different reasons
 *
 * Los caminos (tabla C1-C5, aprobada por Agustín el 8 nov 2026):
 * - C1 segundo aviso en la misma carga: nada (el primero ya sale)
 * - C2 ya en /login con la marca: nada
 * - C3 marca «propia» (revocó su dispositivo): limpia y sale, sin toast ni guardar
 * - C4 marca de otra pestaña o carga («forzado», o la «true» de antes): el cierre
 *   completo de esta pestaña, como la primera vez
 *
 * @param {Object} errorData - Optional error data to determine logout reason
 * @param {string} reason - 'revocation' | 'expiration' | 'unknown'
 */
const handleLogout = (errorData = null, reason = 'unknown', aviso = {}) => {
  if (seEstaCerrandoLaSesion()) return;
  const marca = localStorage.getItem(REVOCATION_HANDLED_KEY);

  // If already on login page and already handled, do nothing (sin anotar el cierre: C2)
  if (marca && window.location.pathname === '/login') {
    return;
  }
  if (!empiezaElCierreDeEstaCarga()) return;

  // Salió a propósito: se limpia lo de la cuenta (DeviceManagement espera 2,5 s antes
  // de su logout, y un 401 o salir de la página se lo saltaban: /code-review), sin
  // aviso ni página guardada
  if (marca === MARCA_DE_LA_REVOCACION_PROPIA) {
    try {
      limpiaLaCuenta();
    } finally {
      redirigeAlLogin({ guardar: false });
    }
    return;
  }

  // Quién estaba dentro, antes de limpiar: la página se guarda con su cuenta (regla 6 de
  // `vueltaTrasEntrar`) y otra cuenta que entre en esta pestaña no vuelve a ella
  const cuenta = quienEstaDentro();

  // Pase lo que pase dentro, se sale (revisión, 8 nov): con el cierre de esta carga ya
  // anotado, un fallo aquí (almacenamiento lleno, Sentry, el toast) dejaría la pestaña
  // con la sesión muerta y sin otro aviso que la sacara
  try {
    // Que se vea en Sentry (FE #1042): una vez por carga, como el aviso al usuario. Antes
    // de limpiar, que quita el usuario de Sentry y el evento saldría sin él; no lanza
    avisaDelCierreForzado(aviso);

    // La cuenta antes que la marca: un almacenamiento lleno al escribirla no deja sus
    // datos en el dispositivo (CodeRabbit), y limpiar le hace sitio
    limpiaLaCuenta();

    localStorage.setItem(REVOCATION_HANDLED_KEY, MARCA_DEL_CIERRE_FORZADO);

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
  } finally {
    // Redirect to login after a short delay (allow toast to be visible), con la página
    // en la que estaba para volver tras entrar: la redirección dura pierde el `state.from`
    redirigeAlLogin({ retraso: 500, cuenta });
  }
};
