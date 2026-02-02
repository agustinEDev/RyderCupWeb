/**
 * Use Case: Remove Golf Course from Competition
 *
 * Business Rules:
 * - Competition must be in DRAFT status
 * - Golf course must be associated with the competition
 * - Display order of remaining courses is automatically recalculated
 */
class RemoveGolfCourseFromCompetitionUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to remove a golf course from a competition.
   *
   * @param {string} competitionId - The ID of the competition.
   * @param {string} golfCourseId - The ID of the golf course to remove.
   * @returns {Promise<Object>} - The removal confirmation (competition_id, golf_course_id, removed_at).
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
    const result = await this.competitionRepository.removeGolfCourse(competitionId, golfCourseId);

    return result;
  }
}

export default RemoveGolfCourseFromCompetitionUseCase;
