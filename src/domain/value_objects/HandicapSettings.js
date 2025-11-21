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
 * @readonly
 * @enum {string}
 */
export const HandicapType = Object.freeze({
  SCRATCH: 'SCRATCH',
  PERCENTAGE: 'PERCENTAGE',
});

export class HandicapSettings {
  /**
   * @type {HandicapType}
   * @private
   */
  #type;

  /**
   * @type {?number} // Nullable number
   * @private
   */
  #percentage;

  /**
   * Creates an instance of HandicapSettings.
   * @param {HandicapType} type The type of handicap calculation (SCRATCH or PERCENTAGE).
   * @param {?number} percentage The numerical percentage (90, 95, or 100) for PERCENTAGE type, or null for SCRATCH.
   * @throws {InvalidHandicapSettingsError} If the settings are invalid according to business rules.
   */
  constructor(type, percentage) {
    if (!Object.values(HandicapType).includes(type)) {
      throw new InvalidHandicapSettingsError(`Invalid HandicapType: ${type}`);
    }

    if (type === HandicapType.SCRATCH) {
      if (percentage !== null && percentage !== undefined) {
        throw new InvalidHandicapSettingsError("For SCRATCH type, percentage must be null or undefined.");
      }
    } else if (type === HandicapType.PERCENTAGE) {
      const allowedPercentages = [90, 95, 100];
      if (percentage === null || percentage === undefined) {
        throw new InvalidHandicapSettingsError("For PERCENTAGE type, percentage is mandatory.");
      }
      if (typeof percentage !== 'number' || !Number.isFinite(percentage) || !allowedPercentages.includes(percentage)) {
        throw new InvalidHandicapSettingsError(
          `For PERCENTAGE type, percentage must be one of ${allowedPercentages.join(', ')}. Received: ${percentage}`
        );
      }
    }

    this.#type = type;
    this.#percentage = percentage === undefined ? null : percentage; // Normalize undefined to null
    Object.freeze(this);
  }

  /**
   * Returns the type of handicap setting.
   * @returns {HandicapType}
   */
  type() {
    return this.#type;
  }

  /**
   * Returns the numerical percentage of the handicap setting.
   * @returns {?number} The percentage or null if type is SCRATCH.
   */
  percentage() {
    return this.#percentage;
  }

  /**
   * Checks if the tournament is of SCRATCH type (no handicap applied).
   * @returns {boolean} True if SCRATCH, False if PERCENTAGE.
   */
  isScratch() {
    return this.#type === HandicapType.SCRATCH;
  }

  /**
   * Checks if the tournament allows handicap to be applied (PERCENTAGE type).
   * @returns {boolean} True if PERCENTAGE, False if SCRATCH.
   */
  allowsHandicap() {
    return this.#type === HandicapType.PERCENTAGE;
  }

  /**
   * Returns the configured allowance percentage.
   * @returns {?number} The percentage (90, 95, 100) or null if type is SCRATCH.
   */
  getAllowancePercentage() {
    return this.#percentage;
  }

  /**
   * Returns a string representation of the HandicapSettings.
   * @returns {string}
   */
  toString() {
    if (this.isScratch()) {
      return "SCRATCH (No Handicap)";
    }
    return `PERCENTAGE ${this.#percentage}%`;
  }

  /**
   * Compares this HandicapSettings with another for equality.
   * @param {HandicapSettings} other The other HandicapSettings to compare with.
   * @returns {boolean} True if the settings are equal, false otherwise.
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof HandicapSettings)) return false;
    return this.#type === other.#type && this.#percentage === other.#percentage;
  }
}