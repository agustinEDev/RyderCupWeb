/**
 * RejectGolfCourseUseCase
 * Rejects a golf course (admin only)
 * Changes status from PENDING_APPROVAL to REJECTED
 *
 * @param {Object} dependencies - Injected dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 */
class RejectGolfCourseUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  /**
   * Execute the use case
   * @param {string} id - Golf course ID
   * @param {string} reason - Rejection reason (10-500 chars)
   * @returns {Promise<GolfCourse>} Rejected golf course
   */
  async execute(id, reason) {
    if (!id) {
      throw new Error('Golf course ID is required');
    }

    if (!reason || reason.trim().length < 10 || reason.trim().length > 500) {
      throw new Error('Rejection reason must be between 10 and 500 characters');
    }

    return await this.golfCourseRepository.reject(id, reason);
  }
}

export default RejectGolfCourseUseCase;
