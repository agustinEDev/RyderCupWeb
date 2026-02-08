// src/domain/value_objects/MatchFormat.js

/**
 * @readonly
 * @enum {string}
 */
export const MatchFormatEnum = Object.freeze({
  SINGLES: 'SINGLES',
  FOURBALL: 'FOURBALL',
  FOURSOMES: 'FOURSOMES',
});

export class MatchFormat {
  /** @type {string} @private */
  #value;

  /**
   * @param {string} value
   * @throws {Error} If value is not a valid MatchFormatEnum member.
   */
  constructor(value) {
    if (!Object.values(MatchFormatEnum).includes(value)) {
      throw new Error(`Invalid match format: ${value}`);
    }
    this.#value = value;
    Object.freeze(this);
  }

  /** @returns {string} */
  value() { return this.#value; }

  /** @returns {string} */
  toString() { return this.#value; }

  /** @returns {boolean} */
  isSingles() { return this.#value === MatchFormatEnum.SINGLES; }

  /** @returns {boolean} */
  isFourball() { return this.#value === MatchFormatEnum.FOURBALL; }

  /** @returns {boolean} */
  isFoursomes() { return this.#value === MatchFormatEnum.FOURSOMES; }

  /**
   * Returns the number of players per team for this format.
   * @returns {number} 1 for SINGLES, 2 for FOURBALL/FOURSOMES
   */
  playersPerTeam() {
    return this.#value === MatchFormatEnum.SINGLES ? 1 : 2;
  }

  /**
   * @param {MatchFormat} other
   * @returns {boolean}
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof MatchFormat)) return false;
    return this.#value === other.#value;
  }
}

MatchFormat.SINGLES = new MatchFormat(MatchFormatEnum.SINGLES);
MatchFormat.FOURBALL = new MatchFormat(MatchFormatEnum.FOURBALL);
MatchFormat.FOURSOMES = new MatchFormat(MatchFormatEnum.FOURSOMES);

Object.freeze(MatchFormat);
