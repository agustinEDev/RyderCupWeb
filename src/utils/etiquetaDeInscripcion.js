/**
 * El texto del estado de una inscripción, para la etiqueta de la ficha y de la
 * lista de competiciones.
 *
 * INVITED habla del jugador, así que concuerda con su género: INVITADO o
 * INVITADA (sin género, INVITADO). El resto habla de la inscripción: APROBADA,
 * CANCELADA, RETIRADA… (Agustín, 4 oct 2026). Usa el contexto de i18next:
 * `enrollmentStatus.INVITED_female` frente a `enrollmentStatus.INVITED`.
 *
 * @param {Function} t - El `t` del namespace `competitions`
 * @param {string|null} estado - REQUESTED, INVITED, APPROVED, REJECTED, CANCELLED o WITHDRAWN
 * @param {string|null} [genero] - El del jugador: MALE, FEMALE o nada
 * @returns {string}
 */
export const etiquetaDeInscripcion = (t, estado, genero) => {
  if (!estado) return '';
  return t(`enrollmentStatus.${estado}`, genero === 'FEMALE' ? { context: 'female' } : undefined);
};
