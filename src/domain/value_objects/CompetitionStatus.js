// src/domain/value_objects/CompetitionStatus.js

/**
 * @readonly
 * @enum {string}
 */
export const CompetitionStatusEnum = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

const validTransitions = {
  [CompetitionStatusEnum.DRAFT]: [CompetitionStatusEnum.ACTIVE, CompetitionStatusEnum.CANCELLED],
  [CompetitionStatusEnum.ACTIVE]: [CompetitionStatusEnum.CLOSED, CompetitionStatusEnum.CANCELLED],
  [CompetitionStatusEnum.CLOSED]: [CompetitionStatusEnum.IN_PROGRESS, CompetitionStatusEnum.CANCELLED],
  [CompetitionStatusEnum.IN_PROGRESS]: [CompetitionStatusEnum.COMPLETED, CompetitionStatusEnum.CANCELLED],
  [CompetitionStatusEnum.COMPLETED]: [],
  [CompetitionStatusEnum.CANCELLED]: [],
};

export class CompetitionStatus {
  /**
   * @param {CompetitionStatusEnum} value
   */
  constructor(value) {
    if (!Object.values(CompetitionStatusEnum).includes(value)) {
      throw new Error(`Invalid competition status: ${value}`);
    }
    this.value = value;
    Object.freeze(this);
  }

  /**
   * @param {CompetitionStatus} newStatus
   * @returns {boolean}
   */
  canTransitionTo(newStatus) {
    const allowedTransitions = validTransitions[this.value];
    return allowedTransitions.includes(newStatus.value);
  }

  /**
   * @returns {boolean}
   */
  isFinal() {
    return this.value === CompetitionStatusEnum.COMPLETED || this.value === CompetitionStatusEnum.CANCELLED;
  }

  /**
   * @returns {string}
   */
  toString() {
    return this.value;
  }

  /**
   * @param {CompetitionStatus} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof CompetitionStatus && this.value === other.value;
  }
}

// Static factory methods for convenience
CompetitionStatus.DRAFT = new CompetitionStatus(CompetitionStatusEnum.DRAFT);
CompetitionStatus.ACTIVE = new CompetitionStatus(CompetitionStatusEnum.ACTIVE);
CompetitionStatus.CLOSED = new CompetitionStatus(CompetitionStatusEnum.CLOSED);
CompetitionStatus.IN_PROGRESS = new CompetitionStatus(CompetitionStatusEnum.IN_PROGRESS);
CompetitionStatus.COMPLETED = new CompetitionStatus(CompetitionStatusEnum.COMPLETED);
CompetitionStatus.CANCELLED = new CompetitionStatus(CompetitionStatusEnum.CANCELLED);

Object.freeze(CompetitionStatus);
