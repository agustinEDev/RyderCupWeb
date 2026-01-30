/**
 * ApproveGolfCourseUpdateUseCase
 * Approves a golf course update (admin only)
 * Applies clone changes to original and deletes clone
 *
 * @param {Object} dependencies - Injected dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 */
class ApproveGolfCourseUpdateUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  /**
   * Execute the use case
   * @param {string} cloneId - Clone golf course ID
   * @returns {Promise<GolfCourse>} Updated original golf course
   */
  async execute(cloneId) {
    if (!cloneId) {
      throw new Error('Clone ID is required');
    }

    return await this.golfCourseRepository.approveUpdate(cloneId);
  }
}

export default ApproveGolfCourseUpdateUseCase;
