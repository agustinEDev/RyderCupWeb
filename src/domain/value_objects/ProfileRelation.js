/**
 * La relación de quien mira un perfil con su dueño, como la manda la ficha
 * del jugador. No es `FriendshipStatus`: distingue quién pidió la amistad
 * (`PENDING_SENT` / `PENDING_RECEIVED`) y tiene `NONE` para cuando no hay nada.
 *
 * Los valores son los del backend (modules/social/application/dto/profile_dto.py).
 *
 * @readonly
 * @enum {string}
 */
export const ProfileRelation = Object.freeze({
  NONE: 'NONE',
  PENDING_SENT: 'PENDING_SENT',
  PENDING_RECEIVED: 'PENDING_RECEIVED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  BLOCKED: 'BLOCKED',
});
