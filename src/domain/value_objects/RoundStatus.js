/**
 * El estado de una sesión (ronda) de una competición: esperando equipos,
 * esperando partidos, programada, en juego o terminada.
 *
 * Los valores son los del backend, con la misma grafía (modules/competition/domain/value_objects/round_status.py).
 *
 * @readonly
 * @enum {string}
 */
export const RoundStatus = Object.freeze({
  PENDING_TEAMS: 'PENDING_TEAMS',
  PENDING_MATCHES: 'PENDING_MATCHES',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
});
