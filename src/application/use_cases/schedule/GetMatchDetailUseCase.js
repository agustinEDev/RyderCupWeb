class GetMatchDetailUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(matchId) {
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    return await this.scheduleRepository.getMatchDetail(matchId);
  }
}

export default GetMatchDetailUseCase;
