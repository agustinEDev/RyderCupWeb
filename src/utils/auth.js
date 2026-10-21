/**
 * Authentication helpers: where to go after signing in, and logging that
 * redacts secrets.
 *
 * The token and localStorage helpers that lived here were unused leftovers of
 * the pre-cookie session (FE #244): the session is httpOnly cookies now.
 */

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
