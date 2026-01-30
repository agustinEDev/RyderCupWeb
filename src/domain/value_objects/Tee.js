/**
 * Tee Value Object
 * Represents a tee position on a golf course
 */
class Tee {
  constructor({ teeCategory, identifier, courseRating, slopeRating }) {
    this.teeCategory = teeCategory;
    this.identifier = identifier;
    this.courseRating = courseRating;
    this.slopeRating = slopeRating;

    this.validate();
  }

  validate() {
    const validCategories = [
      'CHAMPIONSHIP_MALE',
      'AMATEUR_MALE',
      'FORWARD_MALE',
      'CHAMPIONSHIP_FEMALE',
      'AMATEUR_FEMALE',
      'FORWARD_FEMALE',
    ];

    if (!validCategories.includes(this.teeCategory)) {
      throw new Error(`Invalid tee category: ${this.teeCategory}`);
    }

    if (!this.identifier || this.identifier.trim().length === 0) {
      throw new Error('Tee identifier is required');
    }

    if (this.courseRating < 50.0 || this.courseRating > 90.0) {
      throw new Error('Course rating must be between 50.0 and 90.0');
    }

    if (this.slopeRating < 55 || this.slopeRating > 155) {
      throw new Error('Slope rating must be between 55 and 155');
    }
  }

  toDTO() {
    return {
      tee_category: this.teeCategory,
      identifier: this.identifier,
      course_rating: this.courseRating,
      slope_rating: this.slopeRating,
    };
  }

  static fromDTO(dto) {
    return new Tee({
      teeCategory: dto.tee_category,
      identifier: dto.identifier,
      courseRating: dto.course_rating,
      slopeRating: dto.slope_rating,
    });
  }
}

export default Tee;
