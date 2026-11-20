import { Team } from '../../../domain/value_objects/Team';

class ConcedeMatchUseCase {
  constructor({ scoringRepository }) {
    this.scoringRepository = scoringRepository;
  }

  async execute(matchId, concedingTeam, reason) {
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    if (!concedingTeam || ![Team.A, Team.B].includes(concedingTeam)) {
      throw new Error('Conceding team must be A or B');
    }
    return await this.scoringRepository.concedeMatch(
      matchId,
      concedingTeam,
      reason || null,
    );
  }
}

export default ConcedeMatchUseCase;
