class DeclareWalkoverUseCase {
  constructor({ scheduleRepository }) {
    this.scheduleRepository = scheduleRepository;
  }

  async execute(matchId, winningTeam, reason) {
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    if (!winningTeam || !['A', 'B'].includes(winningTeam)) {
      throw new Error('Winning team must be A or B');
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw new Error('Reason is required');
    }
    return await this.scheduleRepository.declareWalkover(matchId, winningTeam, reason);
  }
}

export default DeclareWalkoverUseCase;
