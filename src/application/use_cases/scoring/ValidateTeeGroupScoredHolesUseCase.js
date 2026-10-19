/**
 * Validar de una vez lo anotado por quien juega sin marcador en juego
 * (organizador; QA del 11 oct 2026, BE #539). Los hoyos con los dos golpes
 * distintos se siguen corrigiendo uno a uno.
 */
class ValidateTeeGroupScoredHolesUseCase {
  constructor({ teeGroupScoringRepository }) {
    this.teeGroupScoringRepository = teeGroupScoringRepository;
  }

  async execute(groupId, userId) {
    if (!groupId) throw new Error('Group ID is required');
    if (!userId) throw new Error('User ID is required');
    return this.teeGroupScoringRepository.validateScored(groupId, userId);
  }
}

export default ValidateTeeGroupScoredHolesUseCase;
