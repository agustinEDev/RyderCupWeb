import CompetitionAssembler from '../../assemblers/CompetitionAssembler';

/** @typedef {import('../../../domain/repositories/ICompetitionRepository').ICompetitionRepository} ICompetitionRepository */

class ListUserCompetitionsUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to list all competitions for a specific user.
   * @param {string} userId - The ID of the user/creator.
   * @param {object} filters - Optional filters (status, etc.)
   * @returns {Promise<Object[]>} - An array of simple DTOs for the UI with essential fields.
   */
  async execute(userId, filters = {}) {
    // Validate input
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Fetch competitions from repository (domain entities + extras)
    const competitions = await this.competitionRepository.findByCreator(
      userId,
      filters,
    );

    // Convert domain entities to simple DTOs for UI, with their extras
    return competitions.map(({ entity, extras }) =>
      CompetitionAssembler.toSimpleDTO(entity, extras),
    );
  }
}

export default ListUserCompetitionsUseCase;
