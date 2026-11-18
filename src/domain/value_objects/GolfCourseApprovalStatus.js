/**
 * El estado de aprobación de un campo de golf: pendiente de que lo apruebe un
 * administrador, aprobado o rechazado.
 *
 * Los valores son los del backend, con la misma grafía (modules/golf_course/domain/value_objects/approval_status.py).
 *
 * @readonly
 * @enum {string}
 */
export const GolfCourseApprovalStatus = Object.freeze({
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

/**
 * @param {unknown} value
 * @returns {boolean} Si es uno de los valores de GolfCourseApprovalStatus
 */
export const isValidGolfCourseApprovalStatus = (value) =>
  Object.values(GolfCourseApprovalStatus).includes(value);
