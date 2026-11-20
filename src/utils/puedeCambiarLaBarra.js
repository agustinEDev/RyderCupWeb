import { CompetitionStatusEnum } from '../domain/value_objects/CompetitionStatus';

// Antes de empezar, el propio jugador también puede (RyderCupAm#912)
const ANTES_DE_EMPEZAR = new Set([
  CompetitionStatusEnum.DRAFT,
  CompetitionStatusEnum.ACTIVE,
  CompetitionStatusEnum.CLOSED,
]);
// Terminada o cancelada, nadie
const CERRADA = new Set([
  CompetitionStatusEnum.COMPLETED,
  CompetitionStatusEnum.CANCELLED,
]);

// El capitán de SU equipo (no el subcapitán): hacen falta los capitanes y el
// reparto, porque el equipo del jugador sale del reparto
const esSuCapitan = ({ userId, jugadorId, captains, reparto }) =>
  (captains?.teamA === userId &&
    Boolean(reparto?.teamAPlayerIds?.includes(jugadorId))) ||
  (captains?.teamB === userId &&
    Boolean(reparto?.teamBPlayerIds?.includes(jugadorId)));

/**
 * Quién puede cambiar la barra de una inscripción (FE #1214): la misma regla
 * que el backend (RyderCupAm#912). Antes de empezar, el propio jugador, el
 * capitán de su equipo o quien gestiona (organizador o admin); con la
 * competición en curso, solo el capitán de su equipo o quien gestiona;
 * terminada o cancelada, nadie. Sin usuario identificado, nadie.
 *
 * @param {Object} p
 * @param {string} p.estado - El de la competición
 * @param {string|null|undefined} p.userId - Quien mira
 * @param {string|null|undefined} p.jugadorId - El dueño de la inscripción
 * @param {boolean} p.gestiona - `puedeGestionarLaCompeticion` de quien mira
 * @param {{teamA?: string, teamB?: string}|null} [p.captains]
 * @param {{teamAPlayerIds?: string[], teamBPlayerIds?: string[]}|null} [p.reparto]
 * @returns {boolean}
 */
export const puedeCambiarLaBarra = ({
  estado,
  userId,
  jugadorId,
  gestiona,
  captains,
  reparto,
}) => {
  if (!userId || CERRADA.has(estado)) return false;
  if (gestiona || esSuCapitan({ userId, jugadorId, captains, reparto }))
    return true;
  return userId === jugadorId && ANTES_DE_EMPEZAR.has(estado);
};
