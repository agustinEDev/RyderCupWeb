/**
 * Value Object: QuickMatchStatus
 *
 * Represents the status of a quick match (informal match between friends).
 * Compatible with backend Python: QuickMatchStatus (Enum).
 *
 * States:
 * - PENDING: Created, roster still open
 * - IN_PROGRESS: Started, scorers assigned, holes can be scored
 * - COMPLETED: Creator marked it as finished
 * - CANCELLED: Creator cancelled it (from PENDING or IN_PROGRESS)
 *
 * Transitions:
 * - PENDING -> IN_PROGRESS | CANCELLED
 * - IN_PROGRESS -> COMPLETED | CANCELLED
 * - COMPLETED, CANCELLED -> (terminal states)
 */
class QuickMatchStatus {
  static PENDING = 'PENDING';
  static IN_PROGRESS = 'IN_PROGRESS';
  static COMPLETED = 'COMPLETED';
  static CANCELLED = 'CANCELLED';

  static VALID_TRANSITIONS = {
    [QuickMatchStatus.PENDING]: [QuickMatchStatus.IN_PROGRESS, QuickMatchStatus.CANCELLED],
    [QuickMatchStatus.IN_PROGRESS]: [QuickMatchStatus.COMPLETED, QuickMatchStatus.CANCELLED],
    [QuickMatchStatus.COMPLETED]: [],
    [QuickMatchStatus.CANCELLED]: [],
  };

  #value;

  constructor(value) {
    if (!QuickMatchStatus.isValid(value)) {
      throw new Error(
        `Invalid QuickMatchStatus: ${value}. ` +
          `Valid values: ${QuickMatchStatus.getAllValues().join(', ')}`
      );
    }
    this.#value = value;
  }

  static pending() {
    return new QuickMatchStatus(QuickMatchStatus.PENDING);
  }

  static inProgress() {
    return new QuickMatchStatus(QuickMatchStatus.IN_PROGRESS);
  }

  static completed() {
    return new QuickMatchStatus(QuickMatchStatus.COMPLETED);
  }

  static cancelled() {
    return new QuickMatchStatus(QuickMatchStatus.CANCELLED);
  }

  static fromString(value) {
    return new QuickMatchStatus(value);
  }

  static isValid(value) {
    return QuickMatchStatus.getAllValues().includes(value);
  }

  static getAllValues() {
    return [
      QuickMatchStatus.PENDING,
      QuickMatchStatus.IN_PROGRESS,
      QuickMatchStatus.COMPLETED,
      QuickMatchStatus.CANCELLED,
    ];
  }

  canTransitionTo(targetStatus) {
    if (!(targetStatus instanceof QuickMatchStatus)) {
      throw new TypeError('targetStatus must be a QuickMatchStatus instance');
    }

    const allowedTransitions = QuickMatchStatus.VALID_TRANSITIONS[this.#value];
    return allowedTransitions.includes(targetStatus.toString());
  }

  isPending() {
    return this.#value === QuickMatchStatus.PENDING;
  }

  isInProgress() {
    return this.#value === QuickMatchStatus.IN_PROGRESS;
  }

  isCompleted() {
    return this.#value === QuickMatchStatus.COMPLETED;
  }

  isCancelled() {
    return this.#value === QuickMatchStatus.CANCELLED;
  }

  toString() {
    return this.#value;
  }

  equals(other) {
    if (!(other instanceof QuickMatchStatus)) {
      return false;
    }
    return this.#value === other.#value;
  }
}

export default QuickMatchStatus;
