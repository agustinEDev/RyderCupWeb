class UpdateRoundUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId, roundData) {
    if (!roundId) {
      throw new Error('Round ID is required');
    }
    if (!roundData || typeof roundData !== 'object') {
      throw new Error('Round data is required');
    }
    return await this.scheduleRepository.updateRound(roundId, roundData);
  }
}

export default UpdateRoundUseCase;
