/**
 * Value Object: HoleScore
 *
 * Validates a golf hole score entered by a player.
 * Valid values: integers 1-9, or null (picked up ball / dash).
 *
 * Used by SubmitHoleScoreUseCase to validate player input before
 * sending to the backend.
 */
class HoleScore {
  static MIN = 1;
  static MAX = 9;

  #value;

  constructor(value) {
    if (value === null || value === undefined) {
      this.#value = null;
      return;
    }

    const score = Number(value);

    if (!Number.isInteger(score)) {
      throw new Error(
        `Invalid HoleScore: ${value}. Must be an integer between ${HoleScore.MIN}-${HoleScore.MAX} or null (picked up).`
      );
    }

    if (score < HoleScore.MIN || score > HoleScore.MAX) {
      throw new Error(
        `Invalid HoleScore: ${score}. Must be between ${HoleScore.MIN} and ${HoleScore.MAX}.`
      );
    }

    this.#value = score;
  }

  static of(value) {
    return new HoleScore(value);
  }

  static pickedUp() {
    return new HoleScore(null);
  }

  isPickedUp() {
    return this.#value === null;
  }

  getValue() {
    return this.#value;
  }

  toString() {
    return this.#value === null ? '-' : String(this.#value);
  }

  equals(other) {
    if (!(other instanceof HoleScore)) {
      return false;
    }
    return this.#value === other.#value;
  }
}

export default HoleScore;
