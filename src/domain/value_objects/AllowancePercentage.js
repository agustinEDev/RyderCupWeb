// src/domain/value_objects/AllowancePercentage.js

export class AllowancePercentage {
  /** @type {?number} @private */
  #value;

  /**
   * Creates an AllowancePercentage (50-100 in increments of 5, or null for WHS default).
   * @param {?number} value - The allowance percentage or null.
   * @throws {Error} If value is invalid.
   */
  constructor(value) {
    if (value === null || value === undefined) {
      this.#value = null;
      Object.freeze(this);
      return;
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`Allowance percentage must be a number. Received: ${value}`);
    }

    if (value < 50 || value > 100) {
      throw new Error(`Allowance percentage must be between 50 and 100. Received: ${value}`);
    }

    if (value % 5 !== 0) {
      throw new Error(`Allowance percentage must be in increments of 5. Received: ${value}`);
    }

    this.#value = value;
    Object.freeze(this);
  }

  /** @returns {?number} */
  value() { return this.#value; }

  /** @returns {boolean} True if a custom percentage is set (not null/WHS default). */
  isCustom() { return this.#value !== null; }

  /** @returns {string} */
  toString() {
    if (this.#value === null) {
      return 'WHS Default';
    }
    return `${this.#value}%`;
  }

  /**
   * @param {AllowancePercentage} other
   * @returns {boolean}
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof AllowancePercentage)) return false;
    return this.#value === other.#value;
  }
}
