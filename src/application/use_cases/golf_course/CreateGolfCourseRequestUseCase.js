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

    // Validate name
    if (!golfCourseData.name || typeof golfCourseData.name !== 'string' || golfCourseData.name.trim().length === 0) {
      throw new Error('Golf course name is required and must be a non-empty string');
    }

    // Validate country code
    if (!golfCourseData.countryCode || typeof golfCourseData.countryCode !== 'string' || golfCourseData.countryCode.length !== 2) {
      throw new Error('Golf course country is required');
    }

    // Validate tees
    if (!Array.isArray(golfCourseData.tees) || golfCourseData.tees.length === 0) {
      throw new Error('Golf course must have at least one tee');
    }

    // Validate each tee has required fields
    golfCourseData.tees.forEach((tee, index) => {
      if (!tee.identifier || typeof tee.identifier !== 'string') {
        throw new Error(`Tee ${index + 1} must have a valid identifier`);
      }
      if (!tee.teeCategory) {
        throw new Error(`Tee ${index + 1} must have a category`);
      }
      if (typeof tee.slopeRating !== 'number') {
        throw new Error(`Tee ${index + 1} must have a numeric slope rating`);
      }
      if (typeof tee.courseRating !== 'number') {
        throw new Error(`Tee ${index + 1} must have a numeric course rating`);
      }
    });

    // Validate holes
    if (!Array.isArray(golfCourseData.holes) || golfCourseData.holes.length !== 18) {
      throw new Error('Golf course must have exactly 18 holes');
    }

    // Validate each hole has numeric par within allowed range
    golfCourseData.holes.forEach((hole, index) => {
      if (typeof hole.par !== 'number') {
        throw new Error(`Hole ${index + 1} must have a numeric par value`);
      }
      if (hole.par < 3 || hole.par > 5) {
        throw new Error(`Hole ${index + 1} par must be between 3 and 5 (current: ${hole.par})`);
      }
    });

    // Validate total par (66-76 range)
    const totalPar = golfCourseData.holes.reduce((sum, hole) => sum + hole.par, 0);
    if (totalPar < 66 || totalPar > 76) {
      throw new Error(`Total par must be between 66 and 76 (current: ${totalPar})`);
    }

    // Call repository to create golf course request
    const createdCourse = await this.golfCourseRepository.create(golfCourseData);

    return createdCourse;
  }
}

export default CreateGolfCourseRequestUseCase;
