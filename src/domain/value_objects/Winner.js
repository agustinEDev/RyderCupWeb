import { Team } from './Team';

/**
 * Quién ganó un hoyo o un partido: uno de los dos equipos o nadie (empate,
 * `HALVED`). No es el resultado para un jugador (eso es MatchOutcome).
 *
 * Los valores son los del backend, con la misma grafía (shared/domain/services/match_play_scoring.py).
 *
 * @readonly
 * @enum {string}
 */
export const Winner = Object.freeze({
  A: Team.A,
  B: Team.B,
  HALVED: 'HALVED',
});
