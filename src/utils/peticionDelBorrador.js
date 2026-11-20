import { parseTeeKey } from './asistenteDePartidaRapida';

// Un hándicap que no se tocó no viaja: el servidor usa el del perfil
const override = (p) => (p.handicap !== p.profileHandicap ? p.handicap : null);

const jugadorDeLaPeticion = (p) =>
  p.isGuest
    ? {
        kind: 'GUEST',
        firstName: p.firstName,
        lastName: p.lastName,
        handicap: p.handicap,
        team: p.team,
        teeColor: p.color,
        teeGender: p.teeGender,
      }
    : {
        kind: 'FRIEND',
        friendUserId: p.userId,
        handicap: override(p),
        team: p.team,
        teeColor: p.color,
        teeGender: p.teeGender,
      };

/**
 * Lo que manda el asistente de partida rápida al «Confirmar e iniciar» (FE
 * #848): crear, iniciar y fijar los hándicaps en una sola petición. Sin
 * interfaz: recibe el borrador tal cual lo tiene el asistente.
 *
 * Quien crea va aparte (su barra y, si lo cambió, su hándicap); el resto, en
 * `participants`. Sin campo lanza, como antes: quien la llama lo trata como
 * cualquier otro fallo al empezar.
 *
 * @returns {Object} El cuerpo de `createAndStartQuickMatchUseCase`, sin el id
 *   del intento
 */
export const peticionDelBorrador = ({
  participants,
  currentUserId,
  creatorTeeKey,
  selectedCourse,
  isFreePlay,
  matchFormat,
  scoringFormat,
  matchName,
  nombreSugerido,
  allowancePercentage,
  playMode,
  scorerIds,
}) => {
  const creador = participants.find((p) => p.userId === currentUserId);
  const { color: creatorTeeColor, teeGender: creatorTeeGender } =
    parseTeeKey(creatorTeeKey);
  return {
    golfCourseId: selectedCourse.id,
    matchFormat: isFreePlay ? null : matchFormat,
    scoringFormat: isFreePlay ? scoringFormat : null,
    name: matchName.trim() || nombreSugerido || null,
    allowancePercentage,
    playMode,
    creatorTeeColor,
    creatorTeeGender,
    creatorHandicap: creador ? override(creador) : null,
    participants: participants
      .filter((p) => p.userId !== currentUserId)
      .map(jugadorDeLaPeticion),
    // El `participantId` de un registrado es su UserId
    scorerUserIds: scorerIds,
  };
};
