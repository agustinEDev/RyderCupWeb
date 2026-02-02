/**
 * Use Case: Reorder Golf Courses in Competition
 *
 * Business Rules:
 * - Competition must be in DRAFT status
 * - Must include ALL golf course IDs currently associated
 * - No duplicate IDs allowed
 * - All IDs must exist in the competition
 */
class ReorderGolfCoursesUseCase {
  /**
   * @param {Object} deps - The dependencies object.
   * @param {ICompetitionRepository} deps.competitionRepository - The competition repository.
   */
  constructor({ competitionRepository }) {
    this.competitionRepository = competitionRepository;
  }

  /**
   * Executes the use case to reorder golf courses in a competition.
   *
   * @param {string} competitionId - The ID of the competition.
   * @param {string[]} golfCourseIds - Array of golf course IDs in the new order.
   * @returns {Promise<Object>} - The reordered golf courses with display_order.
   * @throws {Error} If validation fails or operation fails.
   */
  async execute(competitionId, golfCourseIds) {
    // Input validation
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('Competition ID is required and must be a string');
    }

    if (!Array.isArray(golfCourseIds)) {
      throw new Error('Golf Course IDs must be an array');
    }

    if (golfCourseIds.length === 0) {
      throw new Error('Golf Course IDs array cannot be empty');
    }

    // Check for duplicates
    const uniqueIds = new Set(golfCourseIds);
    if (uniqueIds.size !== golfCourseIds.length) {
      throw new Error('Duplicate golf course IDs found in the array');
    }

    // Validate all IDs are strings
    const allStrings = golfCourseIds.every(id => typeof id === 'string' && id.length > 0);
    if (!allStrings) {
      throw new Error('All golf course IDs must be non-empty strings');
    }

    // Call repository (backend validates business rules)
    const result = await this.competitionRepository.reorderGolfCourses(competitionId, golfCourseIds);

    return result;
  }
}

export default ReorderGolfCoursesUseCase;
