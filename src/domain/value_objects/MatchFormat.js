/**
 * El formato de un partido de match play: individual, fourball (mejor bola)
 * o foursomes (golpes alternos). Lo comparten el torneo y la partida rápida.
 *
 * Los valores son los del backend, con la misma grafía (shared/domain/value_objects/match_format.py).
 *
 * @readonly
 * @enum {string}
 */
export const MatchFormat = Object.freeze({
  SINGLES: 'SINGLES',
  FOURBALL: 'FOURBALL',
  FOURSOMES: 'FOURSOMES',
});

/**
 * @param {unknown} value
 * @returns {boolean} Si es uno de los valores de MatchFormat
 */
export const isValidMatchFormat = (value) =>
  /** @type {unknown[]} */ (Object.values(MatchFormat)).includes(value);

/**
 * Si el formato se juega por parejas (fourball y foursomes).
 * @param {?string} value
 * @returns {boolean}
 */
export const isTeamMatchFormat = (value) =>
  value === MatchFormat.FOURBALL || value === MatchFormat.FOURSOMES;
