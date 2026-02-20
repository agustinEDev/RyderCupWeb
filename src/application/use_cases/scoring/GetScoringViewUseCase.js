class GetScoringViewUseCase {
  constructor({ scoringRepository }) {
    this.scoringRepository = scoringRepository;
  }

  async execute(matchId) {
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    return await this.scoringRepository.getScoringView(matchId);
  }
}

export default GetScoringViewUseCase;
