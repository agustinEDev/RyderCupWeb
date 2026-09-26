/**
 * Use Case: Nombrar a los capitanes (FE #692).
 *
 * En el servidor, nombrarlos cierra las inscripciones (RyderCupAM#320): es la
 * acción con propósito que sustituye a «Cerrar inscripciones». Ya cerradas, los
 * cambia mientras no haya equipos. Con un número impar de inscritos responde
 * `uneven_teams`: un aviso, no un bloqueo.
 */
class NameCaptainsUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * @param {string} competitionId
   * @param {{teamA: string, teamB: string}} capitanes - Los userId de los dos
   * @returns {Promise<{id, status, captains: {teamA, teamB}, totalPlayers, unevenTeams}>}
   */
  async execute(competitionId, { teamA, teamB } = {}) {
    if (!competitionId) throw new Error('Competition ID is required');
    if (!teamA || !teamB) throw new Error('Both captains are required');

    const data = await this.competitionRepository.nameCaptains(competitionId, {
      team_a_captain_id: teamA,
      team_b_captain_id: teamB,
    });

    return {
      id: data.id,
      status: data.status,
      captains: { teamA: data.team_a_captain_id, teamB: data.team_b_captain_id },
      totalPlayers: data.total_players,
      unevenTeams: data.uneven_teams === true,
    };
  }
}

export default NameCaptainsUseCase;
