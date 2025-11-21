// src/domain/value_objects/TeamAssignment.js

/**
 * @readonly
 * @enum {string}
 */
export const TeamAssignmentEnum = Object.freeze({
  MANUAL: 'MANUAL',
  AUTOMATIC: 'AUTOMATIC',
});

export class TeamAssignment {
  /**
   * @type {string}
   * @private
   */
  #value;

  /**
   * Creates an instance of TeamAssignment.
   * @param {string} value The type of team assignment (MANUAL or AUTOMATIC).
   * @throws {Error} If the provided value is not a valid TeamAssignmentEnum member.
   */
  constructor(value) {
    if (!Object.values(TeamAssignmentEnum).includes(value)) {
      throw new Error(`Invalid TeamAssignment: ${value}`);
    }
    this.#value = value;
    Object.freeze(this);
  }

  /**
   * Returns the primitive string value of the TeamAssignment.
   * @returns {string} The team assignment type string.
   */
  value() {
    return this.#value;
  }

  /**
   * Returns the string representation of the TeamAssignment.
   * @returns {string} The team assignment type string.
   */
  toString() {
    return this.#value;
  }

  /**
   * Checks if the assignment type is MANUAL.
   * @returns {boolean} True if MANUAL, false otherwise.
   */
  isManual() {
    return this.#value === TeamAssignmentEnum.MANUAL;
  }

  /**
   * Checks if the assignment type is AUTOMATIC.
   * @returns {boolean} True if AUTOMATIC, false otherwise.
   */
  isAutomatic() {
    return this.#value === TeamAssignmentEnum.AUTOMATIC;
  }

  /**
   * Compares this TeamAssignment with another for equality.
   * Value Objects are compared by their value, not by reference.
   * @param {TeamAssignment} other The other TeamAssignment to compare with.
   * @returns {boolean} True if the assignment types are equal, false otherwise.
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof TeamAssignment)) return false;
    return this.#value === other.#value;
  }
}

// Static factory methods for convenience
TeamAssignment.MANUAL = new TeamAssignment(TeamAssignmentEnum.MANUAL);
TeamAssignment.AUTOMATIC = new TeamAssignment(TeamAssignmentEnum.AUTOMATIC);

Object.freeze(TeamAssignment);
