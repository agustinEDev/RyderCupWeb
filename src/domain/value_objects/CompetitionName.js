// src/domain/value_objects/CompetitionName.js

export class CompetitionName {
  /**
   * @type {string}
   * @private
   */
  #value;

  /**
   * Minimum length for a competition name.
   * @type {number}
   */
  static MIN_LENGTH = 3;

  /**
   * Maximum length for a competition name.
   * @type {number}
   */
  static MAX_LENGTH = 100;

  /**
   * Creates an instance of CompetitionName.
   * @param {string} value The name of the competition.
   * @throws {Error} If the name is null, empty, or outside the valid length range.
   */
  constructor(value) {
    if (!CompetitionName.isValid(value)) {
      throw new Error(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
    }
    this.#value = value.trim();
    Object.freeze(this);
  }

  /**
   * Checks if a given string is a valid competition name.
   * @param {string} value The string to validate.
   * @returns {boolean} True if the string is a valid name, false otherwise.
   */
  static isValid(value) {
    if (typeof value !== 'string' || value === null) {
      return false;
    }
    const trimmedValue = value.trim();
    return (
      trimmedValue.length >= CompetitionName.MIN_LENGTH &&
      trimmedValue.length <= CompetitionName.MAX_LENGTH
    );
  }

  /**
   * Returns the primitive string value of the CompetitionName.
   * @returns {string} The competition name string.
   */
  value() {
    return this.#value;
  }

  /**
   * Returns the string representation of the CompetitionName.
   * @returns {string} The competition name string.
   */
  toString() {
    return this.#value;
  }

  /**
   * Compares this CompetitionName with another for equality.
   * Value Objects are compared by their value, not by reference.
   * @param {CompetitionName} other The other CompetitionName to compare with.
   * @returns {boolean} True if the names are equal, false otherwise.
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof CompetitionName)) return false;
    return this.#value === other.#value;
  }
}
