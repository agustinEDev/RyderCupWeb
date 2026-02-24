/**
 * Use Case: Reopen Enrollments
 * Transitions competition from CLOSED back to ACTIVE.
 * Only the creator can reopen enrollments.
 */
class ReopenEnrollmentsUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to reopen enrollments.
   * @param {string} competitionId - The ID of the competition.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If the operation fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const data = await this.competitionRepository.reopenEnrollments(competitionId);

    return {
      id: data.id,
      name: data.name,
      status: data.status,
      updatedAt: data.updated_at
    };
  }
}

export default ReopenEnrollmentsUseCase;
