/** Reabrir la tarjeta entregada de un jugador (organizador) (FE #824, PR 7). */
class ReopenTeeGroupCardUseCase {
  constructor({ teeGroupScoringRepository }) {
    this.teeGroupScoringRepository = teeGroupScoringRepository;
  }

  async execute(groupId, userId) {
    if (!groupId) throw new Error('Group ID is required');
    if (!userId) throw new Error('User ID is required');
    return this.teeGroupScoringRepository.reopenCard(groupId, userId);
  }
}

export default ReopenTeeGroupCardUseCase;
