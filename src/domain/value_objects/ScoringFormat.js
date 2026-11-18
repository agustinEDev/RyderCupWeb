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
  Object.values(ScoringFormat).includes(value);
