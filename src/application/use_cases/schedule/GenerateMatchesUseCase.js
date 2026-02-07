class GenerateMatchesUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId, pairings = {}) {
    if (!roundId) {
      throw new Error('Round ID is required');
    }
    return await this.scheduleRepository.generateMatches(roundId, pairings);
  }
}

export default GenerateMatchesUseCase;
