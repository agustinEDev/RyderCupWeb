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
 * - Clears authentication state (localStorage + Sentry, the latter through the UI)
 * - Asks the UI to show the message for the reason (text and icon live there)
 * - Redirects to login page (through the UI, which saves the page to come back to)
 *
 * IMPORTANT: v2.0.4 refactor - Separated device revocation from session expiration
 * - isDeviceRevoked() now returns true ONLY for explicit device revocation
 * - isSessionExpired() handles refresh token expiration
 * - Different messages and icons for each scenario
 *
 * @see src/config/dependencies.py:576-583 (backend)
 */

import { esFinalNormalDelRefresco, MOTIVO_DEL_CIERRE } from '../../utils/motivosDelCierre';
// El aviso a Sentry, el usuario de Sentry, el aviso al usuario, la cuenta de la
// pestaña y la redirección con la página guardada: de la interfaz, que la
// composition root registra (la infraestructura no llega a sus librerías)
import { compruebaLaInterfaz, interfaz } from './interfazDelTransporte';
// El freno de un cierre por carga vive en su módulo (C1, S1)
import { empiezaElCierreDeEstaCarga, seEstaCerrandoLaSesion } from '../../utils/cierreDeEstaCarga';

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
  // Un refresco RECHAZADO (dispositivo revocado, contraseña cambiada, cuenta
  // desactivada…) no es una sesión caducada; el backend no dice cuál (BE #733), así que
  // el aviso es el neutro de «ha terminado» (B1, 8 nov 2026). El final normal, «expirado»
  // La misma regla que el motivo de Sentry (`esFinalNormalDelRefresco`): todo lo que no
  // es el final normal es un rechazo, también un código antiguo o un 401 sin código. Sin
  // datos del servidor, el motivo que trae quien llama (CodeRabbit en #1065); sin él,
  // como siempre
  const rechazado =
    errorData != null
      ? !esFinalNormalDelRefresco(errorData)
      : contexto.motivo === MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO;
  handleLogout(errorData, rechazado ? 'ended' : 'expiration', {
    motivo: rechazado ? MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO : MOTIVO_DEL_CIERRE.SESION_CADUCADA,
    ...contexto,
  });
};

// Lo que otros guardan de la cuenta y hay que borrar al cerrar (9 nov 2026).
// Antes este módulo importaba los servicios que lo guardan; infrastructure/http
// no importa services, así que los registra la composition root
// (`composition/limpiezaAlCerrarLaSesion`, que cargan main.jsx el primero y
// AuthContext). Lo usan los cierres forzados (`limpiaLaCuenta`) y el normal
// (`clearAuth`, por `olvidaLoDeLaCuenta`):
// - las partidas guardadas para anotar sin cobertura (FE #524). Los cierres
//   forzados NO pasan por `clearAuth` —salen con una redirección dura—, y una
//   redirección no vacía el almacenamiento: sin esto, quien entrara después en
//   ese móvil podría ver sin cobertura las partidas de la cuenta revocada
// - lo pendiente del hándicap (FE #677): el modal de la siguiente persona
//   saldría con el hándicap de esta cuenta
// - el número de Actividad y el del icono de la aplicación (FE-1), en todos los
//   cierres (decidido el 9 nov 2026)
const limpiezasAlCerrar = [];

const SIN_LIMPIEZAS =
  'No hay limpiezas registradas: falta importar composition/limpiezaAlCerrarLaSesion';

/**
 * Apunta algo que hay que borrar de la cuenta al cerrar la sesión. Se ejecutan
 * en el orden en que se apuntaron; apuntar dos veces la misma no la repite.
 *
 * @param {() => void} limpieza
 */
export const alCerrarLaSesion = (limpieza) => {
  if (limpiezasAlCerrar.includes(limpieza)) return;
  limpiezasAlCerrar.push(limpieza);
};

/**
 * Ejecuta las limpiezas registradas. Sin ninguna registrada falla en voz alta:
 * borrar «nada» sin avisar dejaría los datos de esta cuenta a la siguiente
 * persona del dispositivo. Si una falla, las demás se hacen igual y el primer
 * fallo sale al final: en los cierres forzados, quien llama sale por su `finally`.
 */
export const olvidaLoDeLaCuenta = () => {
  if (limpiezasAlCerrar.length === 0) throw new Error(SIN_LIMPIEZAS);
  // Una que falle no puede dejar sin hacer las demás: cada una borra datos de la
  // cuenta. El primer fallo sale al final, cuando ya se intentaron todas
  let primerFallo = null;
  for (const limpieza of limpiezasAlCerrar) {
    try {
      limpieza();
    } catch (error) {
      primerFallo ??= error;
    }
  }
  if (primerFallo) throw primerFallo;
};

/**
 * Lo de la cuenta que sale, también al revocar el propio dispositivo (C3) y en el cierre
 * por CSRF (S3): una sola limpieza para los cierres duros.
 */
export const limpiaLaCuenta = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('access_token'); // Legacy cleanup
  olvidaLoDeLaCuenta();
  // El usuario de Sentry (por sentryHelpers, en la interfaz): `window.Sentry` no
  // lo asignaba nadie y esta línea no hacía nada (25 oct 2026)
  interfaz().olvidaElUsuarioDeSentry();
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
  // Sin la interfaz registrada falla aquí, antes de tocar nada: ni carga «cerrándose»
  // (que callaría el siguiente cierre), ni limpieza, ni redirección a medias
  compruebaLaInterfaz();
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
      interfaz().redirigeAlLogin({ guardar: false });
    }
    return;
  }

  // Quién estaba dentro, antes de limpiar: la página se guarda con su cuenta (regla 6 de
  // `vueltaTrasEntrar`) y otra cuenta que entre en esta pestaña no vuelve a ella
  const cuenta = interfaz().ultimaCuentaDeEstaPestana();

  // Pase lo que pase dentro, se sale (revisión, 8 nov): con el cierre de esta carga ya
  // anotado, un fallo aquí (almacenamiento lleno, Sentry, el toast) dejaría la pestaña
  // con la sesión muerta y sin otro aviso que la sacara
  try {
    // Que se vea en Sentry (FE #1042): una vez por carga, como el aviso al usuario. Antes
    // de limpiar, que quita el usuario de Sentry y el evento saldría sin él; no lanza
    interfaz().avisaASentryDelCierre(aviso);

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

    // El aviso al usuario según el motivo (revocado, caducado o terminado): su texto y
    // su icono los pone la interfaz. Sin ninguna cuenta conocida en la pestaña no había
    // sesión que terminara: quien abre un enlace sin haber entrado no lee «Tu sesión ha
    // expirado» (Agustín, 8 nov 2026). Un dispositivo revocado de verdad avisa siempre:
    // es un aviso de seguridad
    if (cuenta !== null || reason === 'revocation') {
      interfaz().avisaAlUsuarioDelCierre(reason);
    }
  } finally {
    // Redirect to login after a short delay (allow toast to be visible), con la página
    // en la que estaba para volver tras entrar: la redirección dura pierde el `state.from`
    interfaz().redirigeAlLogin({ retraso: 500, cuenta });
  }
};
