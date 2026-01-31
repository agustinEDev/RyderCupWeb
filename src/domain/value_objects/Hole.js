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
    if (this.holeNumber < 1 || this.holeNumber > 18) {
      throw new Error('Hole number must be between 1 and 18');
    }

    if (this.par < 3 || this.par > 5) {
      throw new Error('Par must be between 3 and 5');
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
