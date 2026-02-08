class AssignTeamsUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(competitionId, teamData) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }
    if (!teamData || typeof teamData !== 'object') {
      throw new Error('Team data is required');
    }
    return await this.scheduleRepository.assignTeams(competitionId, teamData);
  }
}

export default AssignTeamsUseCase;
