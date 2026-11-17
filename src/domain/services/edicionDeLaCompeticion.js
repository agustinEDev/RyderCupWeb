import {
  CompetitionStatus,
  CompetitionStatusEnum,
} from '../value_objects/CompetitionStatus';

/**
 * Cerrada por el plazo (no por el organizador), una competición se mueve: solo
 * las fechas (15 nov 2026, RyderCupAm #865). Una sola regla para el formulario
 * y la ficha (re-auditoría Q-FE-04).
 *
 * @param {{status: string, enrollmentClosedByDeadline?: boolean}} competition
 * @returns {boolean}
 */
export const soloSePuedenEditarLasFechas = (competition) =>
  competition?.status === CompetitionStatusEnum.CLOSED &&
  competition?.enrollmentClosedByDeadline === true;

/**
 * Si se ofrece «Editar»: con las inscripciones abiertas, todo; cerrada por el
 * plazo, solo las fechas.
 *
 * @param {{status: string, enrollmentClosedByDeadline?: boolean}} competition
 * @returns {boolean}
 */
export const seEditaLaCompeticion = (competition) => {
  if (soloSePuedenEditarLasFechas(competition)) return true;
  const status = competition?.status;
  // Sin estado, o uno que no se conoce: no se edita, y la ficha no se cae
  if (!Object.values(CompetitionStatusEnum).includes(status)) return false;
  return new CompetitionStatus(status).allowsModifications();
};
