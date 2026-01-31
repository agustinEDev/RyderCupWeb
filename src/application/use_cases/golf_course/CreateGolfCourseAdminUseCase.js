/**
 * CreateGolfCourseAdminUseCase
 * Creates a golf course directly as APPROVED (admin only)
 *
 * @param {Object} dependencies - Injected dependencies
 * @param {IGolfCourseRepository} dependencies.golfCourseRepository
 */
class CreateGolfCourseAdminUseCase {
  constructor({ golfCourseRepository }) {
    this.golfCourseRepository = golfCourseRepository;
  }

  /**
   * Execute the use case
   * @param {Object} golfCourseData - Golf course data
   * @returns {Promise<GolfCourse>} Created golf course
   */
  async execute(golfCourseData) {
    if (!golfCourseData) {
      throw new Error('Golf course data is required');
    }

    this._validateGolfCourseData(golfCourseData);

    return await this.golfCourseRepository.createAsAdmin(golfCourseData);
  }

  _validateGolfCourseData(data) {
    if (!data.name || data.name.trim().length < 3) {
      throw new Error('Golf course name must be at least 3 characters');
    }

    if (!data.countryCode || data.countryCode.length !== 2) {
      throw new Error('Country code must be 2 characters (ISO 3166-1 alpha-2)');
    }

    if (!['STANDARD_18', 'PITCH_AND_PUTT', 'EXECUTIVE'].includes(data.courseType)) {
      throw new Error('Invalid course type');
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

export default CreateGolfCourseAdminUseCase;
