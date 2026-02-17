/**
 * Use Case: Close Enrollments
 * Transitions competition from ACTIVE to CLOSED state.
 * Only the creator can close enrollments.
 */
class CloseEnrollmentsUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to close enrollments for a competition.
   * @param {string} competitionId - The ID of the competition.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If closing enrollments fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const data = await this.competitionRepository.closeEnrollments(competitionId);

    return {
      id: data.id,
      name: data.name,
      status: data.status,
      updatedAt: data.updated_at
    };
  }
}

export default CloseEnrollmentsUseCase;
