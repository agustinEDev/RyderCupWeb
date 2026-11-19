/**
 * El estado de una partida (grupo de salida) de una franja de stroke play.
 *
 * - SCHEDULED: generada, todavía no ha salido
 * - IN_PROGRESS: en el campo
 * - COMPLETED: acabada
 *
 * Los valores son los del backend, con la misma grafía
 * (modules/competition/domain/value_objects/estado_partida.py, EstadoPartida).
 */
const VALORES = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
});

/** @type {Set<string>} */
const POR_JUGAR = new Set([VALORES.SCHEDULED, VALORES.IN_PROGRESS]);

const TeeGroupStatus = Object.freeze({
  ...VALORES,
  /**
   * Por jugar: programada o en el campo.
   * @param {?string} value
   * @returns {boolean}
   */
  isPlayable: (value) => POR_JUGAR.has(value),
});

export default TeeGroupStatus;
