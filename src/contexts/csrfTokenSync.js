/**
 * CSRF Token Global Sync Utilities
 * v1.13.0: CSRF Protection
 *
 * These utilities allow non-React code (like api.js) to access the CSRF token
 * by syncing it to a module-level variable or reading it from cookies.
 */

let currentCsrfToken = null;

/**
 * Extract CSRF token from document.cookie
 * Fallback method if token is not in React state
 *
 * @returns {string|null} CSRF token from cookie or null
 */
const getCsrfTokenFromCookie = () => {
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];

  return csrfToken || null;
};

/**
 * Get current CSRF token (synchronous)
 * Used by api.js interceptor to add X-CSRF-Token header
 *
 * Priority:
 * 1. Token from React context (synced via setCsrfTokenGlobal)
 * 2. Token from cookie (fallback if context not available)
 *
 * @returns {string|null} Current CSRF token or null
 */
export const getCsrfToken = () => {
  // Priority 1: Token from React context (more reliable)
  if (currentCsrfToken) {
    return currentCsrfToken;
  }

  // Priority 2: Token from cookie (fallback)
  const cookieToken = getCsrfTokenFromCookie();
  if (cookieToken) {
    console.log('📋 [CSRF] Using token from cookie (fallback)');
    return cookieToken;
  }

  return null;
};

/**
 * Set CSRF token in global variable
 * Called by AuthContext when token changes
 *
 * @param {string|null} token - New CSRF token
 */
export const setCsrfTokenGlobal = (token) => {
  currentCsrfToken = token;
};
