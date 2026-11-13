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
const resolvePostAuthTarget = (requestedPath) => {
  if (
    !requestedPath ||
    !requestedPath.startsWith('/') ||
    requestedPath.startsWith('//')
  ) {
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
    const sensitiveFields = [
      'password',
      'token',
      'access_token',
      'refresh_token',
    ];
    sensitiveFields.forEach((field) => {
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

// Barras invertidas y caracteres de control: el navegador los normaliza (una
// `\` pasa a `/`, un tabulador desaparece), y `/\evil.com` acaba en `//evil.com`
// eslint-disable-next-line no-control-regex
const RAROS = /[\\\u0000-\u001f\u007f]/;

/**
 * Una ruta PROPIA (pathname, búsqueda y hash), o null. Se resuelve contra el
 * origen propio y se compara: es la forma de no depender de cómo normalice cada
 * navegador. La usan la vuelta tras entrar y la de aceptar los Términos.
 */
export const rutaPropia = (candidato) => {
  if (
    !candidato ||
    !candidato.startsWith('/') ||
    candidato.startsWith('//') ||
    RAROS.test(candidato)
  ) {
    return null;
  }
  const origen = globalThis.location.origin;
  let url;
  try {
    url = new globalThis.URL(candidato, origen);
  } catch {
    return null;
  }
  return url.origin === origen
    ? `${url.pathname}${url.search}${url.hash}`
    : null;
};

/**
 * A dónde volver tras entrar, desde la ruta protegida de la que venía (su
 * `location`), CON su búsqueda: el enlace que confirma un correo nuevo lleva el
 * token en `?token=` (RyderCupAm #749) y antes se perdía al pasar por el login.
 * Las mismas protecciones que resolvePostAuthTarget.
 */
export const rutaDeVuelta = (from) => {
  const propia = rutaPropia(
    from?.pathname
      ? `${from.pathname}${from.search || ''}${from.hash || ''}`
      : undefined,
  );
  // La de confirmar el correo sin su token (ya usado) no lleva a nada: al volver diría
  // «Este enlace no vale» con el correo ya cambiado. Al panel, venga por donde venga: la
  // página guardada, la de la que venía o la que trae Google (Agustín, 8 nov 2026)
  if (propia && esLaDeConfirmarSinToken(propia)) return '/dashboard';
  return resolvePostAuthTarget(propia ?? undefined);
};

const PAGINA_DE_CONFIRMAR_EL_CORREO = '/confirm-email-change';

/**
 * Si un camino es la página de confirmar el correo, como la reconoce el router: sin
 * distinguir mayúsculas y con o sin barra final.
 */
export const esLaPaginaDeConfirmar = (pathname = '') =>
  pathname.replace(/\/+$/, '').toLowerCase() === PAGINA_DE_CONFIRMAR_EL_CORREO;

/** La página de confirmar el correo sin un token con valor. */
const esLaDeConfirmarSinToken = (ruta) => {
  const url = new globalThis.URL(ruta, globalThis.location.origin);
  return esLaPaginaDeConfirmar(url.pathname) && !url.searchParams.get('token');
};
