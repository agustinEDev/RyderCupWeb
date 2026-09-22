/**
 * Use Case: Cubrir el puesto de capitán de un equipo (FE #692).
 *
 * Pasa cuando un capitán se da de baja después del reparto y no había
 * subcapitán que ascendiera: ese equipo se queda sin capitán, repartir otra vez
 * los pide a los dos y nombrarlos ya no se puede porque hay equipos
 * (RyderCupAm#320). El organizador nombra a otro jugador de ese equipo.
 *
 * Solo cubre un puesto vacío: a un capitán que sigue no se le cambia por aquí,
 * y de eso se encarga el servidor.
 */
const EQUIPOS = ['A', 'B'];

class FillCaptainUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * @param {string} competitionId
   * @param {'A'|'B'} team
   * @param {string} playerId - Un jugador de ese equipo
   * @returns {Promise<{id: string, captains: {teamA, teamB, viceTeamA, viceTeamB}}>}
   */
  async execute(competitionId, team, playerId) {
    if (!competitionId) throw new Error('Competition ID is required');
    if (!EQUIPOS.includes(team)) throw new Error('Team must be A or B');
    if (!playerId) throw new Error('Player ID is required');

    const data = await this.competitionRepository.fillTeamCaptain(competitionId, team, {
      player_id: playerId,
    });

    return {
      id: data.id,
      captains: {
        teamA: data.team_a_captain_id,
        teamB: data.team_b_captain_id,
        viceTeamA: data.team_a_vice_captain_id,
        viceTeamB: data.team_b_vice_captain_id,
      },
    };
  }
}

export default FillCaptainUseCase;
