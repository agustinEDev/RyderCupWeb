/**
 * Redaccion de parametros sensibles en URLs (FE #385).
 *
 * Vive suelto y sin dependencias a proposito: lo usa el arranque de Sentry en
 * `main.jsx`, que es codigo del primer chunk y no puede arrastrar consigo el
 * SDK ni los ayudantes.
 */

/**
 * Parametros de query que no pueden salir hacia Sentry.
 *
 * `lat`/`lon` son la posicion de quien busca campos cerca: se redondean en
 * origen (ver `utils/geo.js`), pero "este barrio" repetido en varias sesiones
 * grabadas sigue siendo un dato que Sentry no necesita.
 */
export const SENSITIVE_QUERY_PARAMS = [
  'token',
  'access_token',
  'refresh_token',
  'lat',
  'lon',
  // La vuelta de Google: el codigo de autorizacion y el nonce anti-CSRF
  'code',
  'state',
];

/**
 * Rutas que llevan el secreto en el propio camino, no en la query: el enlace
 * del correo de restablecimiento es `/reset-password/<token>` (App.jsx), y la
 * pagina lo valida con `/api/v1/auth/validate-reset-token/<token>`.
 */
export const SENSITIVE_PATH_PREFIXES = ['/reset-password/', '/auth/validate-reset-token/'];

// Compiladas una vez: esto se pasa por todo el texto de cada evento.
// El parametro puede ir tras `?`, `&` o `#`, o abrir el texto: `url.query`
// llega sin el `?` delante
const QUERY_PATTERNS = SENSITIVE_QUERY_PARAMS.map(
  (param) => new RegExp(`(^|[?&#])(${param}=)[^&#]*`, 'gi')
);
const PATH_PATTERNS = SENSITIVE_PATH_PREFIXES.map(
  (prefix) => new RegExp(`(${prefix})[^/?#]+`, 'gi')
);

/**
 * Redacta parametros sensibles de una URL, dejandola legible para depurar.
 *
 * Trabaja sobre el texto y no sobre `URL`, porque aqui llegan tanto URLs
 * absolutas como rutas relativas, y `new URL('/api/...')` lanza.
 *
 * @param {string} url
 * @returns {string} La URL con los valores sensibles como [REDACTED]
 *
 * @example
 * scrubUrl('/api/v1/golf-courses?lat=40.417&lon=-3.704')
 * // '/api/v1/golf-courses?lat=[REDACTED]&lon=[REDACTED]'
 */
export const scrubUrl = (url) => {
  if (typeof url !== 'string' || url === '') return url;

  const sinQuery = QUERY_PATTERNS.reduce(
    (scrubbed, pattern) => scrubbed.replace(pattern, '$1$2[REDACTED]'),
    url
  );

  return PATH_PATTERNS.reduce((scrubbed, pattern) => scrubbed.replace(pattern, '$1[REDACTED]'), sinQuery);
};
