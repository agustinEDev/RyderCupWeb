/**
 * La franja del día de una sesión: mañana, tarde o última hora.
 *
 * Los valores son los del backend, con la misma grafía (modules/competition/domain/value_objects/session_type.py).
 *
 * @readonly
 * @enum {string}
 */
export const SessionType = Object.freeze({
  MORNING: 'MORNING',
  AFTERNOON: 'AFTERNOON',
  EVENING: 'EVENING',
});
