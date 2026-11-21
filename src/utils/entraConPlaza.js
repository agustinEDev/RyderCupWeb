import EnrollmentStatus from '../domain/value_objects/EnrollmentStatus';

/**
 * Si apuntarse dejó una inscripción aprobada con plaza (no a la espera ni
 * pendiente): solo entonces tiene sentido pedir la barra de los campos que no
 * tienen la suya (barras por campo, F1).
 *
 * @param {{id?: string, status?: string, waiting?: boolean}|null|undefined} hecho
 * @returns {boolean}
 */
export const entraConPlaza = (hecho) =>
  Boolean(hecho?.id) &&
  hecho.status === EnrollmentStatus.APPROVED &&
  !hecho.waiting;
