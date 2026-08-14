/**
 * Utilidades de posicion (FE #385).
 *
 * La busqueda por cercania solo ordena campos de golf: miden cientos de metros
 * y suelen estar a kilometros unos de otros. La lectura del GPS llega con seis
 * decimales -precision de centimetros, es decir la casa de quien busca- y esa
 * cifra acaba en la query string, o sea en los registros de nginx, Cloudflare,
 * Render y Sentry. Tres decimales bastan para ordenar y convierten "esta en
 * esta direccion" en "esta en este barrio".
 */

/** Decimales con los que salen las coordenadas del navegador (~110 m). */
export const COORDINATE_DECIMALS = 3;

const FACTOR = 10 ** COORDINATE_DECIMALS;

/**
 * Redondea una coordenada a COORDINATE_DECIMALS decimales.
 *
 * Se redondea, no se trunca: truncar desplaza siempre hacia el mismo lado y no
 * gana nada a cambio.
 *
 * @param {number} value Latitud o longitud en grados
 * @returns {number|null} La coordenada redondeada, o null si no es un numero
 */
export const roundCoordinate = (value) => {
  if (!Number.isFinite(value)) return null;

  // El +0 evita devolver -0 para valores como -0.0001
  return Math.round(value * FACTOR) / FACTOR + 0;
};
