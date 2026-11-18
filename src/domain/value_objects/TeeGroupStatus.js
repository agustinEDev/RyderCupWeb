/**
 * Value Object: TeeGroupStatus
 *
 * El estado de una partida (grupo de salida) de una franja de stroke play.
 *
 * - SCHEDULED: generada, todavía no ha salido
 * - IN_PROGRESS: en el campo
 * - COMPLETED: acabada
 *
 * Los valores son los del backend, con la misma grafía (modules/competition/domain/value_objects/estado_partida.py (EstadoPartida)).
 * Las constantes estáticas sirven para comparar el texto que llega de la API
 * (`partido.status === TeeGroupStatus.IN_PROGRESS`); los predicados estáticos, para
 * preguntar sin crear la instancia.
 */
class TeeGroupStatus {
  static SCHEDULED = 'SCHEDULED';
  static IN_PROGRESS = 'IN_PROGRESS';
  static COMPLETED = 'COMPLETED';

  static #POR_JUGAR = new Set([
    TeeGroupStatus.SCHEDULED,
    TeeGroupStatus.IN_PROGRESS,
  ]);

  static #TERMINADOS = new Set([TeeGroupStatus.COMPLETED]);

  #value;

  constructor(value) {
    if (!TeeGroupStatus.isValid(value)) {
      throw new Error(
        `Invalid TeeGroupStatus: ${value}. ` +
          `Valid values: ${TeeGroupStatus.getAllValues().join(', ')}`,
      );
    }
    this.#value = value;
  }

  static isValid(value) {
    return TeeGroupStatus.getAllValues().includes(value);
  }

  static getAllValues() {
    return [
      TeeGroupStatus.SCHEDULED,
      TeeGroupStatus.IN_PROGRESS,
      TeeGroupStatus.COMPLETED,
    ];
  }

  /**
   * Por jugar: programado o en juego.
   * @param {?string} value
   * @returns {boolean}
   */
  static isPlayable(value) {
    return TeeGroupStatus.#POR_JUGAR.has(value);
  }

  /**
   * Terminado: ya no se juega.
   * @param {?string} value
   * @returns {boolean}
   */
  static isFinished(value) {
    return TeeGroupStatus.#TERMINADOS.has(value);
  }

  isPlayable() {
    return TeeGroupStatus.isPlayable(this.#value);
  }

  isFinished() {
    return TeeGroupStatus.isFinished(this.#value);
  }

  toString() {
    return this.#value;
  }

  equals(other) {
    if (!(other instanceof TeeGroupStatus)) {
      return false;
    }
    return this.#value === other.#value;
  }
}

export default TeeGroupStatus;
