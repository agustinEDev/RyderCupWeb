/** El organizador retira a quien ya jugó: no se le puede dar por no presentado (RyderCupAm#553). */
class RetireTeeGroupPlayerUseCase {
  constructor({ teeGroupScoringRepository }) {
    this.teeGroupScoringRepository = teeGroupScoringRepository;
  }

  async execute(groupId, userId) {
    if (!groupId) throw new Error('Group ID is required');
    if (!userId) throw new Error('User ID is required');
    return this.teeGroupScoringRepository.retirePlayer(groupId, userId);
  }
}

export default RetireTeeGroupPlayerUseCase;
