/**
 * Cómo va una actualización de los hándicaps de una competición: en marcha,
 * completa, incompleta (faltan jugadores) o cortada.
 *
 * Los valores son los del backend, con la misma grafía (EstadoActualizacion de
 * modules/competition/domain/entities/actualizacion_de_handicaps.py).
 *
 * @readonly
 * @enum {string}
 */
export const HandicapUpdateStatus = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  INCOMPLETE: 'INCOMPLETE',
  STOPPED: 'STOPPED',
});
