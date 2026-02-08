// src/domain/value_objects/SessionType.js

/**
 * @readonly
 * @enum {string}
 */
export const SessionTypeEnum = Object.freeze({
  MORNING: 'MORNING',
  AFTERNOON: 'AFTERNOON',
  EVENING: 'EVENING',
});

export class SessionType {
  /** @type {string} @private */
  #value;

  /**
   * @param {string} value
   * @throws {Error} If value is not a valid SessionTypeEnum member.
   */
  constructor(value) {
    if (!Object.values(SessionTypeEnum).includes(value)) {
      throw new Error(`Invalid session type: ${value}`);
    }
    this.#value = value;
    Object.freeze(this);
  }

  /** @returns {string} */
  value() { return this.#value; }

  /** @returns {string} */
  toString() { return this.#value; }

  /** @returns {boolean} */
  isMorning() { return this.#value === SessionTypeEnum.MORNING; }

  /** @returns {boolean} */
  isAfternoon() { return this.#value === SessionTypeEnum.AFTERNOON; }

  /** @returns {boolean} */
  isEvening() { return this.#value === SessionTypeEnum.EVENING; }

  /**
   * @param {SessionType} other
   * @returns {boolean}
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof SessionType)) return false;
    return this.#value === other.#value;
  }
}

SessionType.MORNING = new SessionType(SessionTypeEnum.MORNING);
SessionType.AFTERNOON = new SessionType(SessionTypeEnum.AFTERNOON);
SessionType.EVENING = new SessionType(SessionTypeEnum.EVENING);

Object.freeze(SessionType);
