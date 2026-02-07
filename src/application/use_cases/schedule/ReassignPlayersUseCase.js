class ReassignPlayersUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(matchId, teamAIds, teamBIds) {
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    if (!Array.isArray(teamAIds) || teamAIds.length === 0) {
      throw new Error('Team A player IDs are required');
    }
    if (!Array.isArray(teamBIds) || teamBIds.length === 0) {
      throw new Error('Team B player IDs are required');
    }
    return await this.scheduleRepository.reassignPlayers(matchId, teamAIds, teamBIds);
  }
}

export default ReassignPlayersUseCase;
