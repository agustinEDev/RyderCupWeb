/**
 * El género de un jugador, que decide las barras y los textos en femenino.
 *
 * Los valores son los del backend, con la misma grafía (shared/domain/value_objects/gender.py).
 *
 * @readonly
 * @enum {string}
 */
export const Gender = Object.freeze({
  MALE: 'MALE',
  FEMALE: 'FEMALE',
});
