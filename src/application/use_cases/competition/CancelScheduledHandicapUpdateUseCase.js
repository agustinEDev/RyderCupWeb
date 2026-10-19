/**
 * Anular la actualización de hándicaps programada (FE #824).
 */
class CancelScheduledHandicapUpdateUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  async execute(competitionId) {
    if (!competitionId) throw new Error('Competition ID is required');
    return this.competitionRepository.cancelScheduledHandicapUpdate(competitionId);
  }
}

export default CancelScheduledHandicapUpdateUseCase;
