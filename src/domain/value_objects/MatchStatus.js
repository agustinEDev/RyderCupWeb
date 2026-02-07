// src/domain/value_objects/MatchStatus.js

/**
 * @readonly
 * @enum {string}
 */
export const MatchStatusEnum = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  WALKOVER: 'WALKOVER',
});

const validTransitions = {
  [MatchStatusEnum.SCHEDULED]: [MatchStatusEnum.IN_PROGRESS, MatchStatusEnum.WALKOVER],
  [MatchStatusEnum.IN_PROGRESS]: [MatchStatusEnum.COMPLETED, MatchStatusEnum.WALKOVER],
  [MatchStatusEnum.COMPLETED]: [],
  [MatchStatusEnum.WALKOVER]: [],
};

export class MatchStatus {
  /**
   * @param {string} value
   * @throws {Error} If value is not a valid MatchStatusEnum member.
   */
  constructor(value) {
    if (!Object.values(MatchStatusEnum).includes(value)) {
      throw new Error(`Invalid match status: ${value}`);
    }
    this.value = value;
    Object.freeze(this);
  }

  /**
   * @param {MatchStatus} newStatus
   * @returns {boolean}
   */
  canTransitionTo(newStatus) {
    const allowed = validTransitions[this.value];
    return allowed.includes(newStatus.value);
  }

  /** @returns {boolean} */
  isFinal() {
    return this.value === MatchStatusEnum.COMPLETED ||
           this.value === MatchStatusEnum.WALKOVER;
  }

  /** @returns {boolean} */
  isPlayable() {
    return this.value === MatchStatusEnum.SCHEDULED ||
           this.value === MatchStatusEnum.IN_PROGRESS;
  }

  /** @returns {string} */
  toString() { return this.value; }

  /**
   * @param {MatchStatus} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof MatchStatus && this.value === other.value;
  }
}

MatchStatus.SCHEDULED = new MatchStatus(MatchStatusEnum.SCHEDULED);
MatchStatus.IN_PROGRESS = new MatchStatus(MatchStatusEnum.IN_PROGRESS);
MatchStatus.COMPLETED = new MatchStatus(MatchStatusEnum.COMPLETED);
MatchStatus.WALKOVER = new MatchStatus(MatchStatusEnum.WALKOVER);

Object.freeze(MatchStatus);
