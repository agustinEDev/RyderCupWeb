/**
 * Quién ve una competición: privada (por invitación) o pública (inscripción
 * directa).
 *
 * Los valores son los del backend, con la misma grafía (modules/competition/domain/value_objects/visibility.py).
 *
 * @readonly
 * @enum {string}
 */
export const Visibility = Object.freeze({
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
});
