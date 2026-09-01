/**
 * Authentication and Security Utilities
 * Provides token validation, sanitization, and security helpers
 */

/**
 * Checks if a JWT token is expired
 * @param {string} token - JWT token to validate
 * @returns {boolean} - True if expired, false otherwise
 */
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // Validate that exp exists and is a finite number
    if (!payload.exp || !Number.isFinite(Number(payload.exp))) {
      if (import.meta.env.DEV) {
        console.error('Token has invalid or missing exp claim:', payload.exp);
      }
      return true; // Treat as expired if exp is missing or invalid
    }

    // Add 30 second buffer to account for clock skew
    return payload.exp * 1000 < (Date.now() + 30000);
  } catch (error) {
    // If we can't decode the token, consider it expired
    if (import.meta.env.DEV) {
      console.error('Error decoding token:', error);
    }
    return true;
  }
};

/**
 * Validates a token and cleans up localStorage if invalid
 * @param {string} token - Token to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const validateToken = (token) => {
  if (!token) {
    clearAuthData();
    return false;
  }

  if (isTokenExpired(token)) {
    clearAuthData();
    return false;
  }

  return true;
};

/**
 * Clears authentication data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

/**
 * De quién es la sesión que hay guardada, solo el id.
 *
 * Distinto de `getCurrentUser`, que exige un `access_token` en el
 * almacenamiento y hoy siempre devuelve null porque la sesión va en cookies
 * httpOnly. Aquí solo hace falta saber A QUIÉN pertenece lo que se va a
 * limpiar, y eso hay que leerlo ANTES de borrar el `user`: los tres caminos de
 * salida —cierre normal, fallo de CSRF y revocación del dispositivo— tienen
 * almacenes que solo se pueden vaciar por cuenta (FE #521).
 *
 * @returns {string|null}
 */
export const idDeLaCuentaGuardada = () => {
  try {
    const crudo = localStorage.getItem('user');
    return crudo ? (JSON.parse(crudo)?.id ?? null) : null;
  } catch {
    return null;
  }
};

/**
 * Gets the current authenticated user
 * @returns {Object|null} - User object or null if not authenticated
 */
export const getCurrentUser = () => {
  const token = localStorage.getItem('access_token');
  const userData = localStorage.getItem('user');

  if (!validateToken(token) || !userData) {
    return null;
  }

  try {
    return JSON.parse(userData);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error parsing user data:', error);
    }
    clearAuthData();
    return null;
  }
};

/**
 * Gets the current auth token if valid
 * @returns {string|null} - Token or null if invalid
 */
export const getAuthToken = () => {
  const token = localStorage.getItem('access_token');
  return validateToken(token) ? token : null;
};

/**
 * Checks if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};

/** Landing pages after signing in are never valid redirect targets. */
const AUTH_ROUTES = ['/login', '/register'];

/**
 * Resolves where to send a user who has just been authenticated, whether by the
 * login form or by an already-live session found on an auth page.
 *
 * Only internal paths are honoured, so the redirect cannot be turned into an
 * Open Redirect (CWE-601): `//evil.com` is a protocol-relative URL, not a path.
 * Auth routes are excluded too — navigating back to the page the user is already
 * on leaves the caller's loading state up with nothing to resolve it.
 *
 * @param {string|undefined} requestedPath - Usually `location.state?.from?.pathname`
 * @returns {string} A safe internal path
 */
export const resolvePostAuthTarget = (requestedPath) => {
  if (!requestedPath || !requestedPath.startsWith('/') || requestedPath.startsWith('//')) {
    return '/dashboard';
  }

  const [path] = requestedPath.split(/[?#]/);
  return AUTH_ROUTES.includes(path) ? '/dashboard' : requestedPath;
};

/**
 * Safe logging utility that only logs in development
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Message to log
 * @param {any} data - Data to log (will be sanitized)
 */
export const safeLog = (level, message, data = null) => {
  if (!import.meta.env.DEV) return;

  // Sanitize sensitive data
  let sanitizedData = data;
  if (data && typeof data === 'object') {
    sanitizedData = { ...data };
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'access_token', 'refresh_token'];
    sensitiveFields.forEach(field => {
      if (field in sanitizedData) {
        sanitizedData[field] = '[REDACTED]';
      }
    });
  }

  const logFn = console[level] || console.log;
  if (sanitizedData) {
    logFn(`[${level.toUpperCase()}]`, message, sanitizedData);
  } else {
    logFn(`[${level.toUpperCase()}]`, message);
  }
};
