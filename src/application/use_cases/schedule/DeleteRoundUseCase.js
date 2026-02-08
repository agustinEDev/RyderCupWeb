class DeleteRoundUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(roundId) {
    if (!roundId) {
      throw new Error('Round ID is required');
    }
    return await this.scheduleRepository.deleteRound(roundId);
  }
}

export default DeleteRoundUseCase;
