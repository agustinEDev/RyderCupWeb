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
  // Un día sin hora se deja como está: «2026-09-23Z» no es un formato que el
  // estándar garantice, y un navegador puede rechazarlo (CodeRabbit en la
  // #722). V8 lo acepta, así que ningún test de aquí lo distingue
  if (typeof texto !== 'string' || !texto.includes('T') || CON_HUSO.test(texto)) {
    return new Date(texto);
  }
  return new Date(`${texto}Z`);
};

/**
 * Un instante de la API escrito en el idioma de la aplicación, no en el del
 * navegador ni en un `en-US` fijo (FE #710). Un idioma que `Intl` no entiende
 * lanza RangeError: entonces, el del navegador.
 *
 * @param {string} texto - fecha y hora ISO de la API
 * @param {string} [idioma] - el de i18n
 * @param {Intl.DateTimeFormatOptions} [opciones]
 * @returns {string|null} null si no hay fecha válida
 */
export const instanteEnTexto = (texto, idioma, opciones) => {
  if (!texto) return null;
  const instante = instanteDeLaApi(texto);
  if (Number.isNaN(instante.getTime())) return null;
  try {
    return instante.toLocaleString(idioma, opciones);
  } catch {
    return instante.toLocaleString(undefined, opciones);
  }
};
