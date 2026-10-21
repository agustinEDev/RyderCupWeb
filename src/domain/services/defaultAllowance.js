/**
 * El allowance WHS por defecto de cada formato de la partida rápida: el mismo
 * que `QuickMatch.get_effective_allowance()` del backend. Match play por su
 * formato —SINGLES 100%, FOURBALL 90%, FOURSOMES 50%— y el partido libre
 * (Medal/Stableford, stroke play) 95%.
 *
 * Vivía en las constantes del modal de crear partida; el dominio también lo
 * necesita (`PersonalRoundCalculator`) y no puede importar de `components`.
 */
export const DEFAULT_ALLOWANCE_BY_MATCH_FORMAT = Object.freeze({
  SINGLES: 100,
  FOURBALL: 90,
  FOURSOMES: 50,
});
export const DEFAULT_FREE_PLAY_ALLOWANCE = 95;

/**
 * @param {?string} matchFormat SINGLES/FOURBALL/FOURSOMES, o null en partido libre
 * @returns {number} Un formato desconocido, el 100%: no se recorta a ciegas
 */
export const defaultAllowanceFor = (matchFormat) =>
  matchFormat == null
    ? DEFAULT_FREE_PLAY_ALLOWANCE
    : (DEFAULT_ALLOWANCE_BY_MATCH_FORMAT[matchFormat] ?? 100);
