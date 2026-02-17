/**
 * Use Case: Complete Competition
 * Transitions competition from IN_PROGRESS to COMPLETED state.
 * Only the creator can complete a competition.
 */
class CompleteCompetitionUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to complete a competition.
   * @param {string} competitionId - The ID of the competition to complete.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If completion fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const data = await this.competitionRepository.complete(competitionId);

    return {
      id: data.id,
      name: data.name,
      status: data.status,
      updatedAt: data.updated_at
    };
  }
}

export default CompleteCompetitionUseCase;
