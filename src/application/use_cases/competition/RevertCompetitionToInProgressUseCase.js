/**
 * Use Case: Revert Competition To In Progress
 * Transitions a completed competition back to IN_PROGRESS (e.g. to add another round).
 * Only the creator can revert the competition. Does not modify existing rounds/matches.
 */
class RevertCompetitionToInProgressUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to revert a completed competition to IN_PROGRESS.
   * @param {string} competitionId - The ID of the competition.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If the operation fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const data = await this.competitionRepository.revertToInProgress(competitionId);

    return {
      id: data.id,
      name: data.name,
      status: data.status,
      updatedAt: data.updated_at
    };
  }
}

export default RevertCompetitionToInProgressUseCase;
