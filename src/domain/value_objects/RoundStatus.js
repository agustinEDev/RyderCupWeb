// src/domain/value_objects/RoundStatus.js

/**
 * @readonly
 * @enum {string}
 */
export const RoundStatusEnum = Object.freeze({
  PENDING_TEAMS: 'PENDING_TEAMS',
  PENDING_MATCHES: 'PENDING_MATCHES',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
});

const validTransitions = {
  [RoundStatusEnum.PENDING_TEAMS]: [RoundStatusEnum.PENDING_MATCHES],
  [RoundStatusEnum.PENDING_MATCHES]: [RoundStatusEnum.SCHEDULED],
  [RoundStatusEnum.SCHEDULED]: [RoundStatusEnum.IN_PROGRESS],
  [RoundStatusEnum.IN_PROGRESS]: [RoundStatusEnum.COMPLETED],
  [RoundStatusEnum.COMPLETED]: [],
};

export class RoundStatus {
  /**
   * @param {string} value
   * @throws {Error} If value is not a valid RoundStatusEnum member.
   */
  constructor(value) {
    if (!Object.values(RoundStatusEnum).includes(value)) {
      throw new Error(`Invalid round status: ${value}`);
    }
    this.value = value;
    Object.freeze(this);
  }

  /**
   * @param {RoundStatus} newStatus
   * @returns {boolean}
   */
  canTransitionTo(newStatus) {
    const allowed = validTransitions[this.value];
    return allowed.includes(newStatus.value);
  }

  /** @returns {boolean} */
  isFinal() {
    return this.value === RoundStatusEnum.COMPLETED;
  }

  /** @returns {boolean} */
  isEditable() {
    return this.value === RoundStatusEnum.PENDING_TEAMS ||
           this.value === RoundStatusEnum.PENDING_MATCHES;
  }

  /** @returns {string} */
  toString() { return this.value; }

  /**
   * @param {RoundStatus} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof RoundStatus && this.value === other.value;
  }
}

RoundStatus.PENDING_TEAMS = new RoundStatus(RoundStatusEnum.PENDING_TEAMS);
RoundStatus.PENDING_MATCHES = new RoundStatus(RoundStatusEnum.PENDING_MATCHES);
RoundStatus.SCHEDULED = new RoundStatus(RoundStatusEnum.SCHEDULED);
RoundStatus.IN_PROGRESS = new RoundStatus(RoundStatusEnum.IN_PROGRESS);
RoundStatus.COMPLETED = new RoundStatus(RoundStatusEnum.COMPLETED);

Object.freeze(RoundStatus);
