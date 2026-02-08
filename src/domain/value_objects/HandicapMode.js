// src/domain/value_objects/HandicapMode.js

/**
 * @readonly
 * @enum {string}
 */
export const HandicapModeEnum = Object.freeze({
  MATCH_PLAY: 'MATCH_PLAY',
});

export class HandicapMode {
  /** @type {string} @private */
  #value;

  /**
   * @param {string} value
   * @throws {Error} If value is not a valid HandicapModeEnum member.
   */
  constructor(value) {
    if (!Object.values(HandicapModeEnum).includes(value)) {
      throw new Error(`Invalid handicap mode: ${value}`);
    }
    this.#value = value;
    Object.freeze(this);
  }

  /** @returns {string} */
  value() { return this.#value; }

  /** @returns {string} */
  toString() { return this.#value; }

  /** @returns {boolean} */
  isMatchPlay() { return this.#value === HandicapModeEnum.MATCH_PLAY; }

  /**
   * @param {HandicapMode} other
   * @returns {boolean}
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof HandicapMode)) return false;
    return this.#value === other.#value;
  }
}

HandicapMode.MATCH_PLAY = new HandicapMode(HandicapModeEnum.MATCH_PLAY);

Object.freeze(HandicapMode);
