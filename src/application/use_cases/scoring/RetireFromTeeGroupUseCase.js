/** Retirarse de la partida: la tarjeta queda cerrada a medias (FE #824, PR 7). */
class RetireFromTeeGroupUseCase {
  constructor({ teeGroupScoringRepository }) {
    this.teeGroupScoringRepository = teeGroupScoringRepository;
  }

  async execute(groupId) {
    if (!groupId) throw new Error('Group ID is required');
    return this.teeGroupScoringRepository.retire(groupId);
  }
}

export default RetireFromTeeGroupUseCase;
