import { idAleatorio } from './idAleatorio';

/**
 * Los jugadores del borrador del asistente de partida rápida, con una sola
 * forma: la que pintan los pasos y la que lee `peticionDelBorrador`. Los usan
 * el asistente (al añadir a alguien) y repetir una partida (FE #1021), para
 * que un campo nuevo no se olvide en uno de los dos (`/code-review`).
 *
 * `profileHandicap` es el del perfil: si el hándicap no se cambia, no viaja
 * como override.
 */
export const jugadorRegistrado = ({ userId, name, handicap = null, team = null, color = null, teeGender = null }) => ({
  participantId: userId,
  userId,
  name,
  handicap,
  profileHandicap: handicap,
  team,
  isGuest: false,
  color,
  teeGender,
});

/** Sin cuenta: un id solo del borrador, que no viaja. */
export const jugadorInvitado = ({ firstName, lastName, handicap = null, team = null, color = null, teeGender = null }) => ({
  participantId: `invitado-${idAleatorio()}`,
  userId: null,
  name: `${firstName} ${lastName}`,
  firstName,
  lastName,
  handicap,
  team,
  isGuest: true,
  color,
  teeGender,
});
