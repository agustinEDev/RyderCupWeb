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
export const SENSITIVE_QUERY_PARAMS = ['token', 'access_token', 'refresh_token', 'lat', 'lon'];

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

  return SENSITIVE_QUERY_PARAMS.reduce(
    (scrubbed, param) =>
      scrubbed.replace(new RegExp(`([?&]${param}=)[^&#]*`, 'gi'), '$1[REDACTED]'),
    url
  );
};
