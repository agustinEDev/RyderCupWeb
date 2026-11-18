/**
 * Value Object: MatchStatus
 *
 * El estado de un partido de match play de un torneo.
 *
 * - SCHEDULED: programado, todavía no ha empezado
 * - IN_PROGRESS: en juego
 * - COMPLETED: terminado jugando
 * - WALKOVER: ganado por incomparecencia del rival
 * - CONCEDED: un bando concedió el partido
 *
 * Los valores son los del backend, con la misma grafía (modules/competition/domain/value_objects/match_status.py).
 * Las constantes estáticas sirven para comparar el texto que llega de la API
 * (`partido.status === MatchStatus.IN_PROGRESS`); los predicados estáticos, para
 * preguntar sin crear la instancia.
 */
class MatchStatus {
  static SCHEDULED = 'SCHEDULED';
  static IN_PROGRESS = 'IN_PROGRESS';
  static COMPLETED = 'COMPLETED';
  static WALKOVER = 'WALKOVER';
  static CONCEDED = 'CONCEDED';

  static #POR_JUGAR = new Set([MatchStatus.SCHEDULED, MatchStatus.IN_PROGRESS]);

  static #TERMINADOS = new Set([
    MatchStatus.COMPLETED,
    MatchStatus.WALKOVER,
    MatchStatus.CONCEDED,
  ]);

  #value;

  constructor(value) {
    if (!MatchStatus.isValid(value)) {
      throw new Error(
        `Invalid MatchStatus: ${value}. ` +
          `Valid values: ${MatchStatus.getAllValues().join(', ')}`,
      );
    }
    this.#value = value;
  }

  static isValid(value) {
    return MatchStatus.getAllValues().includes(value);
  }

  static getAllValues() {
    return [
      MatchStatus.SCHEDULED,
      MatchStatus.IN_PROGRESS,
      MatchStatus.COMPLETED,
      MatchStatus.WALKOVER,
      MatchStatus.CONCEDED,
    ];
  }

  /**
   * Por jugar: programado o en juego.
   * @param {?string} value
   * @returns {boolean}
   */
  static isPlayable(value) {
    return MatchStatus.#POR_JUGAR.has(value);
  }

  /**
   * Terminado: ya no se juega.
   * @param {?string} value
   * @returns {boolean}
   */
  static isFinished(value) {
    return MatchStatus.#TERMINADOS.has(value);
  }

  isPlayable() {
    return MatchStatus.isPlayable(this.#value);
  }

  isFinished() {
    return MatchStatus.isFinished(this.#value);
  }

  toString() {
    return this.#value;
  }

  equals(other) {
    if (!(other instanceof MatchStatus)) {
      return false;
    }
    return this.#value === other.#value;
  }
}

export default MatchStatus;
