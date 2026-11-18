/**
 * El estado de la sala de draft de los capitanes: sin empezar, en marcha o
 * terminada.
 *
 * Los valores son los del backend, con la misma grafía (modules/competition/domain/value_objects/draft_status.py).
 *
 * @readonly
 * @enum {string}
 */
export const DraftStatus = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
});

/**
 * @param {unknown} value
 * @returns {boolean} Si es uno de los valores de DraftStatus
 */
export const isValidDraftStatus = (value) =>
  Object.values(DraftStatus).includes(value);
