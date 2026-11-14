/**
 * Cómo se nombra al invitado de una invitación: el nombre (por id, o por correo
 * cuando ya respondió), el correo que tecleó el organizador (por correo) o, si no
 * hay ninguno, un texto. La tarjeta y la ventana de retirar dicen lo mismo y nunca
 * quedan en blanco (auditoría de la fase 6, B-01/B-03).
 *
 * @param {{inviteeName?: string|null, inviteeEmail?: string|null}} invitation
 * @param {(clave: string) => string} t - Traducción del espacio `invitations`
 * @returns {string}
 */
export const quienEsElInvitado = (invitation, t) =>
  invitation?.inviteeName ||
  invitation?.inviteeEmail ||
  t('card.invitedPlayer');
