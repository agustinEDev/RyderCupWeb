/**
 * Los motivos de un cierre de sesión forzado y cómo se reconoce cada 401, sin
 * nada de Sentry ni de la interfaz. Salieron de `avisoDeCierreForzado` (que los
 * reexporta) porque los usa también el transporte (infrastructure/http), que no
 * puede llegar a @sentry/react.
 */

export const MOTIVO_DEL_CIERRE = Object.freeze({
  REFRESCO_RECHAZADO: 'refresh_rejected',
  DISPOSITIVO_REVOCADO: 'device_revoked',
  CSRF_SIN_RECUPERAR: 'csrf_unrecovered',
  SESION_CADUCADA: 'session_expired',
  // El refresco fue bien y la petición repetida volvió con 401: la cookie nueva
  // no se guardó o no se mandó. Es la clase de fallo que echaba a la gente
  SESION_PERDIDA: 'session_lost',
});

// Los `error_code` del 401 del refresco que son el final normal de una sesión. Desde
// RyderCupAm #733 el backend solo manda SESSION_ENDED o SESSION_REJECTED (el motivo
// exacto decía el estado de la cuenta), además de SESSION_REPLACED (#734), que no llega
// aquí: el refresco lo reintenta. Los de antes siguen aquí mientras el backend no se
// despliega: este front sale primero. Se pueden quitar después
const FINAL_NORMAL = new Set([
  'SESSION_ENDED',
  'REFRESH_TOKEN_MISSING',
  'REFRESH_TOKEN_EXPIRED',
  'SESSION_IDLE',
]);

/** Si el `error_code` del refresco es el final normal de una sesión. */
export const esFinalNormalDelRefresco = (errorData) =>
  FINAL_NORMAL.has(errorData?.error_code);

/**
 * El motivo de un 401 del refresco según su `error_code`: el final normal de la
 * sesión, o un rechazo de verdad. Sin código, un rechazo: que se vea.
 *
 * @param {{error_code?: string}|undefined} errorData
 */
export const motivoDelRefrescoRechazado = (errorData) =>
  esFinalNormalDelRefresco(errorData)
    ? MOTIVO_DEL_CIERRE.SESION_CADUCADA
    : MOTIVO_DEL_CIERRE.REFRESCO_RECHAZADO;

// Los 401 de `get_current_user` cuando falla el token de acceso (RyderCupAm
// src/config/dependencies.py). Otro 401 —una contraseña actual mal escrita— no
// dice nada de la sesión
const DE_TOKEN = new Set([
  'credenciales de autenticación no proporcionadas',
  'token inválido o expirado',
  'token inválido: falta subject',
  // El token de antes de BE #737, sin `did`: el refresco lo trae
  'token inválido: falta el dispositivo',
]);

/** Si un 401 es porque el token de acceso no llegó o no vale. */
export const esUn401DeToken = (errorData) =>
  DE_TOKEN.has(
    String(errorData?.detail ?? '')
      .trim()
      .toLowerCase(),
  );
