/**
 * Tee Value Object
 * Represents a tee position on a golf course
 */
class Tee {
  constructor({ teeCategory, identifier, courseRating, slopeRating, gender }) {
    this.teeCategory = teeCategory;
    this.identifier = identifier?.trim();
    this.courseRating = courseRating;
    this.slopeRating = slopeRating;
    this.gender = gender;

    this.validate();
  }

  validate() {
    const validCategories = [
      'CHAMPIONSHIP',
      'AMATEUR',
      'SENIOR',
      'FORWARD',
      'JUNIOR',
    ];

    const validGenders = ['MALE', 'FEMALE'];

    if (!validCategories.includes(this.teeCategory)) {
      throw new Error(`Invalid tee category: ${this.teeCategory}`);
    }

    if (!this.identifier || this.identifier.length === 0) {
      throw new Error('Tee identifier is required');
    }

    // Validate courseRating is a finite number
    if (!Number.isFinite(this.courseRating)) {
      throw new Error('Course rating must be a finite number');
    }
    if (this.courseRating < 50.0 || this.courseRating > 90.0) {
      throw new Error('Course rating must be between 50.0 and 90.0');
    }

    // Validate slopeRating is a finite number
    if (!Number.isFinite(this.slopeRating)) {
      throw new Error('Slope rating must be a finite number');
    }
    if (this.slopeRating < 55 || this.slopeRating > 155) {
      throw new Error('Slope rating must be between 55 and 155');
    }

    // Gender is optional (not sent in creation payload, but returned by backend)
    if (this.gender && !validGenders.includes(this.gender)) {
      throw new Error(`Invalid gender: ${this.gender}`);
    }

    return true;
  }

  toDTO() {
    return {
      tee_category: this.teeCategory,
      identifier: this.identifier,
      course_rating: this.courseRating,
      slope_rating: this.slopeRating,
      tee_gender: this.gender,
    };
  }

  static fromDTO(dto) {
    return new Tee({
      teeCategory: dto.tee_category,
      identifier: dto.identifier,
      courseRating: dto.course_rating,
      slopeRating: dto.slope_rating,
      gender: dto.tee_gender ?? dto.gender ?? null,
    });
  }
}

export { Tee };
export default Tee;
