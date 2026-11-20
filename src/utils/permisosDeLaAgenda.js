import { CompetitionStatusEnum } from '../domain/value_objects/CompetitionStatus';
import EnrollmentStatus from '../domain/value_objects/EnrollmentStatus';
import { Team } from '../domain/value_objects/Team';
import { SetupMode } from '../domain/value_objects/SetupMode';

/**
 * Quien capitanea un equipo tiene un sobre que entregar en cada sesión (FE
 * #655). El organizador entra también: es quien los abre cuando un capitán no
 * aparece.
 */
export const entraALosSobres = ({ userId, captains, creatorId }) => {
  const esCapitan =
    Boolean(userId) && [captains?.teamA, captains?.teamB].includes(userId);
  return esCapitan || (Boolean(userId) && creatorId === userId);
};

/**
 * Los botones de los sobres de cada sesión. Solo en una Ryder y con equipos
 * repartidos: sin ellos no hay a quién ordenar. Abrir el sobre, quien entra a
 * los sobres; rehacerlos es cosa del organizador: el capitán que entregó a
 * tiempo no se queda sin su lista por culpa del que se olvidó.
 */
export const botonesDeLosSobres = ({
  entra,
  canManage,
  setupMode,
  hayEquipos,
}) => {
  const conSobres = setupMode === SetupMode.RYDER_CUP && hayEquipos;
  return {
    abrirSobre: Boolean(entra && conSobres),
    rehacerSobres: Boolean(canManage && conSobres),
  };
};

/**
 * Con partidos, o ya en juego, los equipos son lo jugado: el servidor no los
 * deshace (TEAMS_LOCKED), así que ni se ofrece.
 */
export const sePuedenDeshacerLosEquipos = ({ status, rounds }) =>
  [CompetitionStatusEnum.ACTIVE, CompetitionStatusEnum.CLOSED].includes(
    status,
  ) && !rounds.some((r) => r.matches?.length > 0);

/**
 * Para «Generar»: con la competición cerrada o en juego, la tarjeta de la
 * sesión lo dice.
 */
export const esCompeticionCerrada = (status) =>
  [CompetitionStatusEnum.CLOSED, CompetitionStatusEnum.IN_PROGRESS].includes(
    status,
  );

/**
 * Los jugadores de un equipo que pueden cubrir su capitanía: los que siguen
 * inscritos. El reparto guarda la lista tal cual y una baja no la toca, así que
 * quien se retiró sigue ahí y ya no puede capitanear.
 *
 * @param {Object} params
 * @param {'A'|'B'} params.equipo
 * @param {Object|null} params.teamAssignment - El reparto de la agenda.
 * @param {Array} params.enrollments
 * @param {Map} params.playerNameMap
 * @param {() => string} params.sinNombre - El nombre de quien no lo tiene.
 * @returns {Array<{ userId: string, name: string }>}
 */
export const jugadoresDelEquipo = ({
  equipo,
  teamAssignment,
  enrollments,
  playerNameMap,
  sinNombre,
}) => {
  const lista =
    equipo === Team.A
      ? teamAssignment?.teamAPlayerIds
      : teamAssignment?.teamBPlayerIds;
  const aprobados = new Set(
    enrollments
      .filter((e) => e.status === EnrollmentStatus.APPROVED)
      .map((e) => e.userId),
  );
  return (lista || [])
    .filter((id) => aprobados.has(id))
    .map((id) => ({
      userId: id,
      name: playerNameMap.get(id) || sinNombre(),
    }));
};
