import TeeColor from './TeeColor';

/**
 * Tee Value Object
 * Represents a tee position on a golf course
 *
 * Una salida se identifica por su color y su género. Cuando el color es OTHER
 * hace falta además el identificador, porque OTHER puede repetirse en un mismo
 * campo (las "Championship" británicas, las combinadas estadounidenses).
 */

// Rangos absolutos, unión de los de todos los tipos de campo. Los campos cortos
// no se valoran en la misma escala que los largos: hay pitch & putt federados
// con slope 47 y course rating 46,8.
const MIN_COURSE_RATING = 45.0;
const MAX_COURSE_RATING = 90.0;
const MIN_SLOPE_RATING = 40;
const MAX_SLOPE_RATING = 160;

class Tee {
  constructor({ color, identifier, courseRating, slopeRating, gender, holes = [] }) {
    this.color = color;
    this.identifier = identifier?.trim() || null;
    this.courseRating = courseRating;
    this.slopeRating = slopeRating;
    this.gender = gender;
    this.holes = holes;

    this.validate();
  }

  validate() {
    const validGenders = ['MALE', 'FEMALE'];

    if (!TeeColor.isValid(this.color)) {
      throw new Error(`Invalid tee color: ${this.color}`);
    }

    if (this.color === TeeColor.OTHER && !this.identifier) {
      throw new Error('A tee with color OTHER must have an identifier');
    }

    // Validate courseRating is a finite number
    if (!Number.isFinite(this.courseRating)) {
      throw new Error('Course rating must be a finite number');
    }
    if (this.courseRating < MIN_COURSE_RATING || this.courseRating > MAX_COURSE_RATING) {
      throw new Error(
        `Course rating must be between ${MIN_COURSE_RATING} and ${MAX_COURSE_RATING}`
      );
    }

    // Validate slopeRating is a finite number
    if (!Number.isFinite(this.slopeRating)) {
      throw new Error('Slope rating must be a finite number');
    }
    if (this.slopeRating < MIN_SLOPE_RATING || this.slopeRating > MAX_SLOPE_RATING) {
      throw new Error(`Slope rating must be between ${MIN_SLOPE_RATING} and ${MAX_SLOPE_RATING}`);
    }

    // Gender is optional (not sent in creation payload, but returned by backend)
    if (this.gender && !validGenders.includes(this.gender)) {
      throw new Error(`Invalid gender: ${this.gender}`);
    }

    return true;
  }

  /**
   * Nombre para mostrar: el identificador libre si lo hay, si no el color.
   */
  get displayName() {
    return this.identifier || this.color;
  }

  toDTO() {
    const dto = {
      color: this.color,
      identifier: this.identifier,
      course_rating: this.courseRating,
      slope_rating: this.slopeRating,
      tee_gender: this.gender,
    };

    // La tarjeta propia solo se envía si la salida la tiene: si no, hereda la
    // del campo.
    if (this.holes?.length) {
      dto.holes = this.holes.map((hole) => ({
        hole_number: hole.holeNumber ?? hole.hole_number,
        par: hole.par,
        stroke_index: hole.strokeIndex ?? hole.stroke_index,
        meters: hole.meters ?? null,
      }));
    }

    return dto;
  }

  static fromDTO(dto) {
    return new Tee({
      color: dto.color,
      identifier: dto.identifier,
      courseRating: dto.course_rating,
      slopeRating: dto.slope_rating,
      gender: dto.tee_gender ?? dto.gender ?? null,
      holes: (dto.holes ?? []).map((hole) => ({
        holeNumber: hole.hole_number,
        par: hole.par,
        strokeIndex: hole.stroke_index,
        meters: hole.meters ?? null,
      })),
    });
  }
}

export { Tee };
export default Tee;
