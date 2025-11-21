// src/domain/value_objects/CountryCode.js

/**
 * Custom error for invalid CountryCode.
 */
export class InvalidCountryCodeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidCountryCodeError';
  }
}

export class CountryCode {
  /**
   * @type {string}
   * @private
   */
  #value;

  /**
   * Creates an instance of CountryCode.
   * @param {string} value The 2-letter ISO 3166-1 alpha-2 country code.
   * @throws {InvalidCountryCodeError} If the code is not a valid 2-letter uppercase string.
   */
  constructor(value) {
    if (typeof value !== 'string') {
      throw new InvalidCountryCodeError(
        `Country code must be a string. Received: ${typeof value}`
      );
    }

    const trimmedValue = value.trim();
    const normalizedValue = trimmedValue.toUpperCase();

    if (normalizedValue.length !== 2) {
      throw new InvalidCountryCodeError(
        `Country code must have exactly 2 characters. Received: '${value}' (length: ${normalizedValue.length})`
      );
    }

    // Check if it contains only letters (A-Z)
    if (!/^[A-Z]{2}$/.test(normalizedValue)) {
      throw new InvalidCountryCodeError(
        `Country code must contain only letters (A-Z). Received: '${value}'`
      );
    }

    this.#value = normalizedValue;
    Object.freeze(this);
  }

  value() {
    return this.#value;
  }

  toString() {
    return this.#value;
  }

  equals(other) {
    return other instanceof CountryCode && this.#value === other.#value;
  }
}