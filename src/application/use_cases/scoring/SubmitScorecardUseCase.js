class SubmitScorecardUseCase {
  constructor({ scoringRepository }) {
    this.scoringRepository = scoringRepository;
  }

  async execute(matchId) {
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    return await this.scoringRepository.submitScorecard(matchId);
  }
}

export default SubmitScorecardUseCase;
