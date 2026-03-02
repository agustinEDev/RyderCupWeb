/**
 * Use Case: Revert Competition Status
 * Transitions competition from IN_PROGRESS back to CLOSED.
 * Only the creator can revert the competition to fix the schedule.
 */
class RevertCompetitionStatusUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to revert competition status.
   * @param {string} competitionId - The ID of the competition.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If the operation fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const data = await this.competitionRepository.revertStatus(competitionId);

    return {
      id: data.id,
      name: data.name,
      status: data.status,
      updatedAt: data.updated_at
    };
  }
}

export default RevertCompetitionStatusUseCase;
