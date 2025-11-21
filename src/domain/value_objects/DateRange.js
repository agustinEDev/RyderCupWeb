// src/domain/value_objects/DateRange.js

export class DateRange {
  /**
   * @type {Date}
   * @private
   */
  #startDate;
  /**
   * @type {Date}
   * @private
   */
  #endDate;

  /**
   * Creates an instance of DateRange.
   * @param {Date} startDate The start date of the range.
   * @param {Date} endDate The end date of the range.
   * @throws {Error} If startDate is after endDate.
   */
  constructor(startDate, endDate) {
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      throw new Error('Start date and end date must be Date objects.');
    }
    if (startDate > endDate) {
      throw new Error('Start date cannot be after end date.');
    }

    this.#startDate = startDate;
    this.#endDate = endDate;
    Object.freeze(this);
  }

  /**
   * Returns the start date of the range.
   * @returns {Date}
   */
  get startDate() {
    return this.#startDate;
  }

  /**
   * Returns the end date of the range.
   * @returns {Date}
   */
  get endDate() {
    return this.#endDate;
  }

  /**
   * Compares this DateRange with another for equality.
   * @param {DateRange} other The other DateRange to compare with.
   * @returns {boolean} True if the ranges are equal, false otherwise.
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof DateRange)) return false;

    return this.#startDate.getTime() === other.#startDate.getTime() &&
           this.#endDate.getTime() === other.#endDate.getTime();
  }

  /**
   * Returns a string representation of the DateRange.
   * @returns {string}
   */
  toString() {
    return `From ${this.#startDate.toISOString()} to ${this.#endDate.toISOString()}`;
  }
}
