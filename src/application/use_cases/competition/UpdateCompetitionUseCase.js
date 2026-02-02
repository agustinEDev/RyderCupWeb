/**
 * Use Case: Update Competition
 *
 * Business Rules:
 * - Only creator of the competition can update it (backend validates)
 * - Can only update competitions in DRAFT status (backend validates)
 * - Cannot change competition name to one that already exists
 */
class UpdateCompetitionUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to update a competition.
   *
   * @param {string} competitionId - The ID of the competition to update.
   * @param {Object} competitionData - The updated competition data.
   * @param {string} competitionData.name - The competition name.
   * @param {string} competitionData.team_1_name - Team 1 name.
   * @param {string} competitionData.team_2_name - Team 2 name.
   * @param {string} competitionData.start_date - Start date (YYYY-MM-DD).
   * @param {string} competitionData.end_date - End date (YYYY-MM-DD).
   * @param {string} competitionData.main_country - Main country ISO code.
   * @param {Array} competitionData.countries - Array of adjacent countries.
   * @param {string} competitionData.handicap_type - Handicap type.
   * @param {number} competitionData.number_of_players - Number of players.
   * @param {string} competitionData.team_assignment - Team assignment method.
   * @returns {Promise<Object>} - The updated competition object.
   * @throws {Error} If validation fails or operation fails.
   */
  async execute(competitionId, competitionData) {
    // Input validation
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('Competition ID is required and must be a string');
    }

    if (!competitionData || typeof competitionData !== 'object') {
      throw new Error('Competition data is required and must be an object');
    }

    // Validate required fields
    if (!competitionData.name || competitionData.name.trim().length < 3) {
      throw new Error('Competition name must be at least 3 characters');
    }

    if (!competitionData.team_1_name || competitionData.team_1_name.trim().length === 0) {
      throw new Error('Team 1 name is required');
    }

    if (!competitionData.team_2_name || competitionData.team_2_name.trim().length === 0) {
      throw new Error('Team 2 name is required');
    }

    if (!competitionData.start_date) {
      throw new Error('Start date is required');
    }

    if (!competitionData.end_date) {
      throw new Error('End date is required');
    }

    // Validate dates
    const startDate = new Date(competitionData.start_date);
    const endDate = new Date(competitionData.end_date);

    // Check for Invalid Date
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid start_date');
    }

    if (isNaN(endDate.getTime())) {
      throw new Error('Invalid end_date');
    }

    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    // Call repository (backend validates business rules like ownership and status)
    const competition = await this.competitionRepository.updateCompetition(competitionId, competitionData);

    return competition;
  }
}

export default UpdateCompetitionUseCase;
