/**
 * Use Case: Cancel Competition
 * Transitions competition from any state to CANCELLED state.
 * Only the creator can cancel a competition.
 */
class CancelCompetitionUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to cancel a competition.
   * @param {string} competitionId - The ID of the competition to cancel.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If cancellation fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const data = await this.competitionRepository.cancel(competitionId);

    return {
      id: data.id,
      name: data.name,
      status: data.status,
      updatedAt: data.updated_at
    };
  }
}

export default CancelCompetitionUseCase;
