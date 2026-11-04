/**
 * CSRF Token Global Sync Utilities
 * v1.13.0: CSRF Protection
 *
 * These utilities allow non-React code (like api.js) to access the CSRF token
 * by reading it from the cookie, or from a module-level copy when there is none.
 */

let currentCsrfToken = null;

/**
 * Extract CSRF token from document.cookie, the copy the server compares with
 *
 * @returns {string|null} CSRF token from cookie or null
 */
const getCsrfTokenFromCookie = () => {
  // La ÚLTIMA si hay dos (una puesta por otro subdominio, p. ej.): Starlette
  // se queda con la última al leer la cabecera `Cookie`, y es con la que va a
  // comparar (hotfix 2.63.1). Ojo: `document.cookie` en `www` y la cabecera
  // que llega a `api` no tienen por qué traer las mismas: una `csrf_token`
  // solo de `www` la vería aquí y no el servidor. Hoy no pasa, porque el
  // frontend nunca pone cookies; firmar el token lo cierra del todo (BE #724)
  const valores = document.cookie
    .split('; ')
    .filter((row) => row.startsWith('csrf_token='))
    // Capture everything after first '=' to preserve tokens with '=' padding
    .map((row) => row.substring(row.indexOf('=') + 1));

  return valores.at(-1) || null;
};

/**
 * Get current CSRF token (synchronous)
 * Used by api.js interceptor to add X-CSRF-Token header
 *
 * Priority (hotfix 2.63.1):
 * 1. Token from the cookie: it is what the server compares the header with,
 *    and every refresh rotates it. The in-memory copy falls behind when
 *    another tab refreshes, or when two refreshes cross: a 403 and the user
 *    was logged out.
 * 2. Token from React context / the last refresh (synced via
 *    setCsrfTokenGlobal), when there is no cookie to read.
 *
 * @returns {string|null} Current CSRF token or null
 */
export const getCsrfToken = () => getCsrfTokenFromCookie() ?? currentCsrfToken ?? null;

/**
 * Set CSRF token in global variable
 * Called by AuthContext when token changes
 *
 * @param {string|null} token - New CSRF token
 * @throws {Error} If the provided token is neither a string nor null
 * @returns {string|null} The token that was set
 */
export const setCsrfTokenGlobal = (token) => {
  // Enforce the documented contract: token must be a string or null
  if (token !== null && typeof token !== 'string') {
    throw new Error('[CSRF] Failed to set global CSRF token: expected string or null');
  }

  currentCsrfToken = token;
  return currentCsrfToken;
};
