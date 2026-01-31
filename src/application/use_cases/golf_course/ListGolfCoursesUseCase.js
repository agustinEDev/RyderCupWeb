/**
 * ListGolfCoursesUseCase
 * Lists golf courses with optional filtering
 *
 * @param {Object} dependencies - Injected dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 */
class ListGolfCoursesUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  /**
   * Execute the use case
   * @param {Object} filters - Optional filters
   * @param {string} filters.approvalStatus - Filter by approval status
   * @returns {Promise<GolfCourse[]>} Array of golf courses
   */
  async execute(filters = {}) {
    return await this.golfCourseRepository.list(filters);
  }
}

export default ListGolfCoursesUseCase;
