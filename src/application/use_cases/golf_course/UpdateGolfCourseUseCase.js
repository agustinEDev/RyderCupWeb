/**
 * UpdateGolfCourseUseCase
 * Updates a golf course
 * Workflow:
 * - Admin: updates in-place
 * - Creator editing APPROVED: creates clone for approval
 * - Creator editing PENDING: updates in-place
 *
 * @param {Object} dependencies - Injected dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 */
class UpdateGolfCourseUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  /**
   * Execute the use case
   * @param {string} id - Golf course ID
   * @param {Object} golfCourseData - Updated golf course data
   * @returns {Promise<{golfCourse: GolfCourse, pendingUpdate: GolfCourse|null}>}
   */
  async execute(id, golfCourseData) {
    if (!id) {
      throw new Error('Golf course ID is required');
    }

    if (!golfCourseData) {
      throw new Error('Golf course data is required');
    }

    this._validateGolfCourseData(golfCourseData);

    return await this.golfCourseRepository.update(id, golfCourseData);
  }

  _validateGolfCourseData(data) {
    if (!data.name || data.name.trim().length < 3) {
      throw new Error('Golf course name must be at least 3 characters');
    }

    if (!data.countryCode && !data.country_code) {
      throw new Error('Country code is required');
    }

    if (!data.courseType && !data.course_type) {
      throw new Error('Course type is required');
    }

    if (!data.tees || data.tees.length < 2 || data.tees.length > 6) {
      throw new Error('Golf course must have between 2 and 6 tees');
    }

    if (!data.holes || data.holes.length !== 18) {
      throw new Error('Golf course must have exactly 18 holes');
    }

    // Validate unique stroke indices
    const strokeIndices = data.holes.map(h => h.strokeIndex || h.stroke_index);
    const uniqueIndices = new Set(strokeIndices);
    if (uniqueIndices.size !== 18) {
      throw new Error('Each hole must have a unique stroke index (1-18)');
    }

    // Validate total par
    const totalPar = data.holes.reduce((sum, h) => sum + h.par, 0);
    if (totalPar < 66 || totalPar > 76) {
      throw new Error(`Total par must be between 66 and 76. Got: ${totalPar}`);
    }
  }
}

export default UpdateGolfCourseUseCase;
