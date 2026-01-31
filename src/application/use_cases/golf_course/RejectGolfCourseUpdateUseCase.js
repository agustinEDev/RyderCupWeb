/**
 * RejectGolfCourseUpdateUseCase
 * Rejects a golf course update (admin only)
 * Deletes clone and leaves original unchanged
 *
 * @param {Object} dependencies - Injected dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 */
class RejectGolfCourseUpdateUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  /**
   * Execute the use case
   * @param {string} cloneId - Clone golf course ID
   * @returns {Promise<GolfCourse>} Original golf course
   */
  async execute(cloneId) {
    if (!cloneId) {
      throw new Error('Clone ID is required');
    }

    return await this.golfCourseRepository.rejectUpdate(cloneId);
  }
}

export default RejectGolfCourseUpdateUseCase;
