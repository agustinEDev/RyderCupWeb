/**
 * El resultado de un partido para un jugador: ganado, perdido, empatado o sin
 * terminar (una partida que no cuenta por los hoyos).
 *
 * Los valores son los del backend, con la misma grafía (Outcome de modules/social/domain/services/head_to_head.py, más UNFINISHED
 * de get_recent_matches_use_case.py y games_together.py).
 *
 * @readonly
 * @enum {string}
 */
export const MatchOutcome = Object.freeze({
  WON: 'WON',
  LOST: 'LOST',
  HALVED: 'HALVED',
  UNFINISHED: 'UNFINISHED',
});
