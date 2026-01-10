/**
 * CSRF Token Global Sync Utilities
 * v1.13.0: CSRF Protection
 *
 * These utilities allow non-React code (like api.js) to access the CSRF token
 * by syncing it to a module-level variable.
 */

let currentCsrfToken = null;

/**
 * Get current CSRF token (synchronous)
 * Used by api.js interceptor to add X-CSRF-Token header
 *
 * @returns {string|null} Current CSRF token or null
 */
export const getCsrfToken = () => currentCsrfToken;

/**
 * Set CSRF token in global variable
 * Called by AuthContext when token changes
 *
 * @param {string|null} token - New CSRF token
 */
export const setCsrfTokenGlobal = (token) => {
  currentCsrfToken = token;
};
