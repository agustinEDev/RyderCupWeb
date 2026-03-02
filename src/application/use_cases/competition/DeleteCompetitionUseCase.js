/**
 * Use Case: Delete Competition
 * Deletes a competition that is in DRAFT state.
 * Only the creator can delete a competition.
 */
class DeleteCompetitionUseCase {
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to delete a competition.
   * @param {string} competitionId - The ID of the competition to delete.
   * @returns {Promise<void>}
   * @throws {Error} If deletion fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    await this.competitionRepository.delete(competitionId);
  }
}

export default DeleteCompetitionUseCase;
