/**
 * El estado de un partido de match play de un torneo.
 *
 * - SCHEDULED: programado, todavía no ha empezado
 * - IN_PROGRESS: en juego
 * - COMPLETED: terminado jugando
 * - WALKOVER: ganado por incomparecencia del rival
 * - CONCEDED: un bando concedió el partido
 *
 * Los valores son los del backend, con la misma grafía
 * (modules/competition/domain/value_objects/match_status.py). Se compara el
 * texto que llega de la API con la constante (`partido.status ===
 * MatchStatus.IN_PROGRESS`) y se pregunta con los predicados, que reciben ese
 * mismo texto.
 */
const VALORES = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  WALKOVER: 'WALKOVER',
  CONCEDED: 'CONCEDED',
});

/** @type {Set<string>} */
const POR_JUGAR = new Set([VALORES.SCHEDULED, VALORES.IN_PROGRESS]);
/** @type {Set<string>} */
const TERMINADOS = new Set([
  VALORES.COMPLETED,
  VALORES.WALKOVER,
  VALORES.CONCEDED,
]);

const MatchStatus = Object.freeze({
  ...VALORES,
  /** @returns {string[]} Los valores, en el orden del backend */
  getAllValues: () => Object.values(VALORES),
  /**
   * Por jugar: programado o en juego.
   * @param {?string} value
   * @returns {boolean}
   */
  isPlayable: (value) => POR_JUGAR.has(value),
  /**
   * Terminado: completado, walkover o concedido (`is_finished` del backend).
   * @param {?string} value
   * @returns {boolean}
   */
  isFinished: (value) => TERMINADOS.has(value),
});

export default MatchStatus;
