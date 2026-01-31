/**
 * ApproveGolfCourseUseCase
 * Approves a golf course (admin only)
 * Changes status from PENDING_APPROVAL to APPROVED
 *
 * @param {Object} dependencies - Injected dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 */
class ApproveGolfCourseUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  /**
   * Execute the use case
   * @param {string} id - Golf course ID
   * @returns {Promise<GolfCourse>} Approved golf course
   */
  async execute(id) {
    if (!id) {
      throw new Error('Golf course ID is required');
    }

    return await this.golfCourseRepository.approve(id);
  }
}

export default ApproveGolfCourseUseCase;
