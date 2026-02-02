/**
 * Use Case: Get Competition Golf Courses
 *
 * Retrieves all golf courses associated with a competition,
 * ordered by display_order.
 */
class GetCompetitionGolfCoursesUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to get all golf courses for a competition.
   *
   * @param {string} competitionId - The ID of the competition.
   * @returns {Promise<Object>} - Object containing competition_id and golf_courses array.
   * @throws {Error} If validation fails or operation fails.
   */
  async execute(competitionId) {
    // Input validation
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('Competition ID is required and must be a string');
    }

    // Call repository
    const result = await this.competitionRepository.getCompetitionGolfCourses(competitionId);

    return result;
  }
}

export default GetCompetitionGolfCoursesUseCase;
