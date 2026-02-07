class UpdateMatchStatusUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(matchId, action, result = null) {
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    if (!action) {
      throw new Error('Action is required');
    }
    return await this.scheduleRepository.updateMatchStatus(matchId, action, result);
  }
}

export default UpdateMatchStatusUseCase;
