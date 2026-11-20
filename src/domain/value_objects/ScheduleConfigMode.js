/**
 * Cómo se configura el calendario de rondas: la aplicación las propone según
 * el número de sesiones (automático) o el organizador define cada una
 * (manual).
 *
 * Los valores son los del backend, con la misma grafía (modules/competition/domain/value_objects/schedule_config_mode.py).
 *
 * @readonly
 * @enum {string}
 */
export const ScheduleConfigMode = Object.freeze({
  AUTOMATIC: 'AUTOMATIC',
  MANUAL: 'MANUAL',
});
