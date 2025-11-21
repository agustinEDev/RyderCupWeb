// src/domain/value_objects/CompetitionId.js
import { v4 as uuidv4 } from 'uuid';

export class CompetitionId {
  /**
   * @type {string}
   * @private
   */
  #value;

  /**
   * Creates an instance of CompetitionId.
   * @param {string} value The UUID string for the CompetitionId.
   * @throws {Error} If the provided value is not a valid UUID string.
   */
  constructor(value) {
    if (!CompetitionId.isValid(value)) {
      throw new Error(`Invalid CompetitionId: ${value}`);
    }
    this.#value = value;
    Object.freeze(this);
  }

  /**
   * Generates a new unique CompetitionId.
   * @returns {CompetitionId} A new CompetitionId instance.
   */
  static generate() {
    return new CompetitionId(uuidv4());
  }

  /**
   * Checks if a given string is a valid UUID format (version 4).
   * This is a basic check; for stricter validation, a regex could be used.
   * @param {string} value The string to validate.
   * @returns {boolean} True if the string is a valid UUID, false otherwise.
   */
  static isValid(value) {
    // Basic UUID v4 validation (e.g., "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx")
    // A more robust regex could be: /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
    return typeof value === 'string' && value.length === 36 && value.includes('-');
  }

  /**
   * Returns the primitive string value of the CompetitionId.
   * @returns {string} The UUID string.
   */
  value() {
    return this.#value;
  }

  /**
   * Returns the string representation of the CompetitionId.
   * @returns {string} The UUID string.
   */
  toString() {
    return this.#value;
  }

  /**
   * Compares this CompetitionId with another for equality.
   * Value Objects are compared by their value, not by reference.
   * @param {CompetitionId} other The other CompetitionId to compare with.
   * @returns {boolean} True if the IDs are equal, false otherwise.
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof CompetitionId)) return false;
    return this.#value === other.#value;
  }
}
