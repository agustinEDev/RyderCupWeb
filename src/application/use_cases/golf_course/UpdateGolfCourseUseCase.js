import {
  MAX_TEES,
  MIN_TEES,
  isTeeCountValid,
  parRangeFor,
} from '../../../domain/services/courseTypeRanges';

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

    // Los limites son los del backend (MIN_TEES/MAX_TEES). Con el tope en 10
    // aqui, un campo federado de 12 barras se abria en el formulario y moria al
    // guardar: se podia dar de alta y no se podia editar.
    if (!data.tees || !isTeeCountValid(data.tees.length)) {
      throw new Error(`Golf course must have between ${MIN_TEES} and ${MAX_TEES} tees`);
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

    // El par total es el del tipo de campo, no el de un 18 hoyos. Aqui el tipo
    // llega en cualquiera de las dos formas, como el resto de los campos.
    const totalPar = data.holes.reduce((sum, h) => sum + h.par, 0);
    const [minPar, maxPar] = parRangeFor(data.courseType || data.course_type);
    if (totalPar < minPar || totalPar > maxPar) {
      throw new Error(`Total par must be between ${minPar} and ${maxPar}. Got: ${totalPar}`);
    }
  }
}

export default UpdateGolfCourseUseCase;
