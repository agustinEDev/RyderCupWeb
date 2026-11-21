// src/domain/value_objects/HandicapSettings.js

/**
 * Custom error for invalid HandicapSettings.
 */
export class InvalidHandicapSettingsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidHandicapSettingsError';
  }
}

/**
 * Play mode type enum (replaces old HandicapType with PERCENTAGE).
 * Breaking change from v2.0.x: handicap_type/handicap_percentage -> play_mode
 * @readonly
 * @enum {string}
 */
export const PlayModeType = Object.freeze({
  SCRATCH: 'SCRATCH',
  HANDICAP: 'HANDICAP',
});

export class HandicapSettings {
  /**
   * @type {string} Uno de los valores de PlayModeType
   */
  #type;

  /**
   * Creates an instance of HandicapSettings (PlayMode).
   * @param {string} type The play mode (SCRATCH or HANDICAP), one of PlayModeType.
   * @throws {InvalidHandicapSettingsError} If the type is invalid.
   */
  constructor(type) {
    if (
      !(
        /** @type {readonly string[]} */ (Object.values(PlayModeType)).includes(
          type,
        )
      )
    ) {
      throw new InvalidHandicapSettingsError(`Invalid PlayModeType: ${type}`);
    }

    this.#type = type;
    Object.freeze(this);
  }

  /**
   * Returns the play mode type.
   * @returns {string} One of PlayModeType
   */
  type() {
    return this.#type;
  }

  /**
   * Checks if the tournament is of SCRATCH type (no handicap applied).
   * @returns {boolean} True if SCRATCH, False if HANDICAP.
   */
  isScratch() {
    return this.#type === PlayModeType.SCRATCH;
  }

  /**
   * Checks if the tournament allows handicap to be applied (HANDICAP type).
   * @returns {boolean} True if HANDICAP, False if SCRATCH.
   */
  allowsHandicap() {
    return this.#type === PlayModeType.HANDICAP;
  }

  /**
   * Returns a string representation of the HandicapSettings.
   * @returns {string}
   */
  toString() {
    if (this.isScratch()) {
      return 'SCRATCH (No Handicap)';
    }
    return PlayModeType.HANDICAP;
  }

  /**
   * Compares this HandicapSettings with another for equality.
   * @param {HandicapSettings} other The other HandicapSettings to compare with.
   * @returns {boolean} True if the settings are equal, false otherwise.
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof HandicapSettings)) return false;
    return this.#type === other.#type;
  }
}
