/**
 * Use Case: Start Competition
 * Transitions competition from CLOSED to IN_PROGRESS state.
 * Only the creator can start a competition.
 */
class StartCompetitionUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to start a competition.
   * @param {string} competitionId - The ID of the competition to start.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If starting fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const data = await this.competitionRepository.start(competitionId);

    return {
      id: data.id,
      name: data.name,
      status: data.status,
      updatedAt: data.updated_at
    };
  }
}

export default StartCompetitionUseCase;
