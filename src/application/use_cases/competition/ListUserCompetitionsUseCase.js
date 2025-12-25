import CompetitionMapper from '../../../infrastructure/mappers/CompetitionMapper';

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

    // Fetch competitions from repository (returns domain entities)
    const competitions = await this.competitionRepository.findByCreator(userId, filters);

    // Convert domain entities to simple DTOs for UI
    // Pass original API data for location names parsing
    return competitions.map(competition => CompetitionMapper.toSimpleDTO(competition, competition._apiData));
  }
}

export default ListUserCompetitionsUseCase;
