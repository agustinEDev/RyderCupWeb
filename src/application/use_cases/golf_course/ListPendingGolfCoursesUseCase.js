/**
 * ListPendingGolfCoursesUseCase
 * Lists pending golf courses (admin only)
 * Returns courses with PENDING_APPROVAL status
 *
 * @param {Object} dependencies - Injected dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 */
class ListPendingGolfCoursesUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  /**
   * Execute the use case
   * @returns {Promise<GolfCourse[]>} Array of pending golf courses
   */
  async execute() {
    return await this.golfCourseRepository.listPending();
  }
}

export default ListPendingGolfCoursesUseCase;
