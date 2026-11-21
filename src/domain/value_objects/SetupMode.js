/**
 * Cuánto monta la aplicación por su cuenta en una competición: todo
 * (automático), nada (manual) o el montaje de una Ryder Cup (capitanes,
 * rondas y sobres). No es el tipo de torneo, aunque una de sus palabras
 * coincida.
 *
 * Los valores son los del backend, con la misma grafía (modules/competition/domain/value_objects/setup_mode.py).
 *
 * @readonly
 * @enum {string}
 */
export const SetupMode = Object.freeze({
  AUTOMATIC: 'AUTOMATIC',
  MANUAL: 'MANUAL',
  RYDER_CUP: 'RYDER_CUP',
});
