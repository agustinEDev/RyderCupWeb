import { parRangeFor } from '../../../domain/services/courseTypeRanges';

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

    // 10, no 6: es lo que deja meter el formulario (`handleAddTee`) y lo que
    // dice su mensaje. Con 6 aqui, un campo de 7 barras se aceptaba arriba y
    // reventaba justo despues. El backend admite de 1 a 14.
    if (!data.tees || data.tees.length < 2 || data.tees.length > 10) {
      throw new Error('Golf course must have between 2 and 10 tees');
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

    // El par total es el del tipo de campo, no el de un 18 hoyos: un pitch &
    // putt es par 54-60 y un ejecutivo 61-65. Ver `courseTypeRanges`.
    const totalPar = data.holes.reduce((sum, h) => sum + h.par, 0);
    const [minPar, maxPar] = parRangeFor(data.courseType);
    if (totalPar < minPar || totalPar > maxPar) {
      throw new Error(`Total par must be between ${minPar} and ${maxPar}. Got: ${totalPar}`);
    }
  }
}

export default CreateGolfCourseAdminUseCase;
