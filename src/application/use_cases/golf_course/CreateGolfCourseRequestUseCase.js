/**
 * Create Golf Course Request Use Case
 * Allows creators to request a new golf course (status: PENDING_APPROVAL)
 *
 * Business Rules:
 * - Any authenticated user can request a golf course
 * - Golf course is created with status PENDING_APPROVAL
 * - Admin must approve before it can be used in competitions
 * - Validates: name, country, tees (2-6), holes (18), total par (66-76)
 */
class CreateGolfCourseRequestUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  /**
   * Execute use case
   * @param {object} golfCourseData - Golf course data
   * @returns {Promise<GolfCourse>} Created golf course (PENDING_APPROVAL)
   */
  async execute(golfCourseData) {
    // Validate input
    if (!golfCourseData) {
      throw new Error('Golf course data is required');
    }

    // Validate total par (66-76 range)
    const totalPar = golfCourseData.holes?.reduce((sum, hole) => sum + hole.par, 0) || 0;
    if (totalPar < 66 || totalPar > 76) {
      throw new Error(`Total par must be between 66 and 76 (current: ${totalPar})`);
    }

    // Call repository to create golf course request
    const createdCourse = await this.golfCourseRepository.create(golfCourseData);

    return createdCourse;
  }
}

export default CreateGolfCourseRequestUseCase;
