/**
 * Por qué un jugador reporta un hoyo del mapa, en el orden del menú.
 *
 * Los valores son los del backend (modules/golf_course/domain/entities/hole_report.py).
 *
 * @readonly
 * @enum {string}
 */
export const HoleReportReason = Object.freeze({
  WRONG_HOLE: 'WRONG_HOLE',
  WRONG_LINE: 'WRONG_LINE',
  HOLE_CHANGED: 'HOLE_CHANGED',
});
