import EnrollmentStatus from '../domain/value_objects/EnrollmentStatus';
import InvitationStatus from '../domain/value_objects/InvitationStatus';

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

/**
 * Si aceptar una invitación dejó al jugador dentro, con su inscripción: solo
 * entonces se guarda su barra general y se piden las de los campos que no la
 * tengan (barras por campo). En lista de espera, o sin la inscripción en la
 * respuesta, no se toca nada.
 *
 * @param {{status?: string, enrollmentId?: string}|null|undefined} resultado
 * @returns {boolean}
 */
export const aceptadaConPlaza = (resultado) =>
  Boolean(resultado?.enrollmentId) &&
  resultado.status === InvitationStatus.ACCEPTED;
