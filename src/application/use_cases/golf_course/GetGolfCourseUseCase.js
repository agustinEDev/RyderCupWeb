/**
 * GetGolfCourseUseCase
 * Gets a golf course by ID
 *
 * @param {Object} dependencies - Injected dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 */
class GetGolfCourseUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  /**
   * Execute the use case
   * @param {string} id - Golf course ID
   * @returns {Promise<GolfCourse>} Golf course entity
   */
  async execute(id) {
    if (!id) {
      throw new Error('Golf course ID is required');
    }

    return await this.golfCourseRepository.getById(id);
  }
}

export default GetGolfCourseUseCase;
