/**
 * Cómo se puntúa una partida de juego libre (stroke play): medal (golpes) o
 * stableford (puntos).
 *
 * Los valores son los del backend, con la misma grafía (shared/domain/value_objects/scoring_format.py).
 *
 * @readonly
 * @enum {string}
 */
export const ScoringFormat = Object.freeze({
  MEDAL: 'MEDAL',
  STABLEFORD: 'STABLEFORD',
});

/**
 * @param {unknown} value
 * @returns {boolean} Si es uno de los valores de ScoringFormat
 */
export const isValidScoringFormat = (value) =>
  /** @type {unknown[]} */ (Object.values(ScoringFormat)).includes(value);

/**
 * Si una partida es de juego libre (stroke play): tiene formato de puntuación.
 * Una partida rápida tiene o formato de match play o formato de puntuación,
 * nunca los dos, así que basta con mirar este.
 *
 * Un formato que esta versión no conoce NO es juego libre: no se pinta como
 * medal ni como stableford algo que no se sabe puntuar.
 *
 * @param {?string} scoringFormat
 * @returns {boolean}
 */
export const isFreePlay = (scoringFormat) =>
  isValidScoringFormat(scoringFormat);
