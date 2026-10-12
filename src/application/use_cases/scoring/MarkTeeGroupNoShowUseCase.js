/** Marcar a un jugador como no presentado (organizador) (FE #824, PR 7). */
class MarkTeeGroupNoShowUseCase {
  constructor({ teeGroupScoringRepository }) {
    this.teeGroupScoringRepository = teeGroupScoringRepository;
  }

  async execute(groupId, userId) {
    if (!groupId) throw new Error('Group ID is required');
    if (!userId) throw new Error('User ID is required');
    return this.teeGroupScoringRepository.markNoShow(groupId, userId);
  }
}

export default MarkTeeGroupNoShowUseCase;
