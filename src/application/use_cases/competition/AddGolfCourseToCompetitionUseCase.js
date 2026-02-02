/**
 * Use Case: Add Golf Course to Competition
 *
 * Business Rules:
 * - Competition must be in DRAFT status
 * - Golf course must be APPROVED
 * - Golf course country must be compatible with competition location
 * - No duplicates allowed
 */
class AddGolfCourseToCompetitionUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to add a golf course to a competition.
   *
   * @param {string} competitionId - The ID of the competition.
   * @param {string} golfCourseId - The ID of the golf course to add.
   * @returns {Promise<Object>} - The association details (competition_id, golf_course_id, display_order, added_at).
   * @throws {Error} If validation fails or operation fails.
   */
  async execute(competitionId, golfCourseId) {
    // Input validation
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('Competition ID is required and must be a string');
    }

    if (!golfCourseId || typeof golfCourseId !== 'string') {
      throw new Error('Golf Course ID is required and must be a string');
    }

    // Call repository (backend validates business rules)
    const result = await this.competitionRepository.addGolfCourse(competitionId, golfCourseId);

    return result;
  }
}

export default AddGolfCourseToCompetitionUseCase;
