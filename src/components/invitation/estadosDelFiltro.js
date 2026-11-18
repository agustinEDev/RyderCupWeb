import InvitationStatus from '../../domain/value_objects/InvitationStatus';

/**
 * Los estados del filtro de invitaciones, en el orden en que se ofrecen: el
 * mismo en la lista del organizador y en la del jugador. No es el orden del
 * dominio (getAllValues): la espera va junto a las que siguen vivas.
 */
export const ESTADOS_DEL_FILTRO = Object.freeze([
  InvitationStatus.PENDING,
  InvitationStatus.ACCEPTED,
  InvitationStatus.DECLINED,
  InvitationStatus.EXPIRED,
  InvitationStatus.ON_HOLD,
  InvitationStatus.NO_ROOM,
  InvitationStatus.CANCELLED,
]);
