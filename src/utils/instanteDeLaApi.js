const CON_HUSO = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Un instante que manda la API, como `Date`.
 *
 * Parte del backend fecha con `datetime.now()` sin huso, en un servidor en
 * UTC, y `new Date('2026-09-23T23:55:00')` lo lee como hora LOCAL: en España,
 * algo creado el 24 a las 01:55 se pintaba el 23 (FE #710). Sin huso, es UTC;
 * con `Z` o un desfase, se respeta.
 *
 * @param {string|Date} texto - fecha y hora ISO de la API
 * @returns {Date}
 */
export const instanteDeLaApi = (texto) => {
  if (typeof texto !== 'string' || CON_HUSO.test(texto)) {
    return new Date(texto);
  }
  return new Date(`${texto}Z`);
};
