class GetLeaderboardUseCase {
  constructor({ scoringRepository }) {
    this.scoringRepository = scoringRepository;
  }

  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }
    return await this.scoringRepository.getLeaderboard(competitionId);
  }
}

export default GetLeaderboardUseCase;
