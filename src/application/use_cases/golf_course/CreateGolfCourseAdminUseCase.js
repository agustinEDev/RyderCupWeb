import {
  MAX_TEES,
  MIN_TEES,
  VALID_HOLE_PARS,
  isHoleParValid,
  isTeeCountValid,
  parRangeFor,
} from '../../../domain/services/courseTypeRanges';

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

    // Los limites son los del backend (MIN_TEES/MAX_TEES), no los que cupieran
    // en el formulario: con el tope en 10 habia 24 campos federados —una barra
    // por color y genero— que el panel no podia ni abrir, y dos de una sola
    // barra que tampoco.
    if (!data.tees || !isTeeCountValid(data.tees.length)) {
      throw new Error(`Golf course must have between ${MIN_TEES} and ${MAX_TEES} tees`);
    }

    if (!data.holes || data.holes.length !== 18) {
      throw new Error('Golf course must have exactly 18 holes');
    }

    // El par de cada hoyo, no solo el total: un par 7 compensado con un par 3
    // deja el total dentro de rango y solo lo rechazaba la API, con un 422 sin
    // traducir. Es la misma comprobacion que hace `CreateGolfCourseRequestUseCase`.
    data.holes.forEach((hole, index) => {
      if (!isHoleParValid(hole.par)) {
        throw new Error(
          `Hole ${index + 1} par must be one of ${VALID_HOLE_PARS.join(', ')} (current: ${hole.par})`
        );
      }
    });

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
