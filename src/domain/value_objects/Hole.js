/**
 * Hole Value Object
 * Represents a hole on a golf course
 */
class Hole {
  constructor({ holeNumber, par, strokeIndex }) {
    this.holeNumber = holeNumber;
    this.par = par;
    this.strokeIndex = strokeIndex;

    this.validate();
  }

  validate() {
    // Validate holeNumber type and presence
    if (this.holeNumber === null || this.holeNumber === undefined) {
      throw new Error('Hole number is required');
    }
    if (!Number.isInteger(this.holeNumber)) {
      throw new Error('Hole number must be an integer');
    }
    if (this.holeNumber < 1 || this.holeNumber > 18) {
      throw new Error('Hole number must be between 1 and 18');
    }

    // Validate par type and presence
    if (this.par === null || this.par === undefined) {
      throw new Error('Par is required');
    }
    if (!Number.isInteger(this.par)) {
      throw new Error('Par must be an integer');
    }
    if (this.par < 3 || this.par > 5) {
      throw new Error('Par must be between 3 and 5');
    }

    // Validate strokeIndex type and presence
    if (this.strokeIndex === null || this.strokeIndex === undefined) {
      throw new Error('Stroke index is required');
    }
    if (!Number.isInteger(this.strokeIndex)) {
      throw new Error('Stroke index must be an integer');
    }
    if (this.strokeIndex < 1 || this.strokeIndex > 18) {
      throw new Error('Stroke index must be between 1 and 18');
    }

    return true;
  }

  toDTO() {
    return {
      hole_number: this.holeNumber,
      par: this.par,
      stroke_index: this.strokeIndex,
    };
  }

  static fromDTO(dto) {
    return new Hole({
      holeNumber: dto.hole_number,
      par: dto.par,
      strokeIndex: dto.stroke_index,
    });
  }
}

export { Hole };
export default Hole;
