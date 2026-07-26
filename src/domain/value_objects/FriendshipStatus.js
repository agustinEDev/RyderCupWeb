/**
 * Value Object: FriendshipStatus
 *
 * Represents the status of a friendship between two users.
 * Compatible with backend Python: FriendshipStatus (Enum).
 *
 * States:
 * - PENDING: Request sent, awaiting response
 * - ACCEPTED: Addressee accepted the request
 * - DECLINED: Addressee declined the request
 * - BLOCKED: One of the two users blocked the other
 *
 * Transitions:
 * - PENDING -> ACCEPTED | DECLINED | BLOCKED
 * - ACCEPTED -> BLOCKED
 * - DECLINED, BLOCKED -> (terminal states)
 */
class FriendshipStatus {
  static PENDING = 'PENDING';
  static ACCEPTED = 'ACCEPTED';
  static DECLINED = 'DECLINED';
  static BLOCKED = 'BLOCKED';

  static VALID_TRANSITIONS = {
    [FriendshipStatus.PENDING]: [
      FriendshipStatus.ACCEPTED,
      FriendshipStatus.DECLINED,
      FriendshipStatus.BLOCKED,
    ],
    [FriendshipStatus.ACCEPTED]: [FriendshipStatus.BLOCKED],
    [FriendshipStatus.DECLINED]: [],
    [FriendshipStatus.BLOCKED]: [],
  };

  #value;

  constructor(value) {
    if (!FriendshipStatus.isValid(value)) {
      throw new Error(
        `Invalid FriendshipStatus: ${value}. ` +
          `Valid values: ${FriendshipStatus.getAllValues().join(', ')}`
      );
    }
    this.#value = value;
  }

  static pending() {
    return new FriendshipStatus(FriendshipStatus.PENDING);
  }

  static accepted() {
    return new FriendshipStatus(FriendshipStatus.ACCEPTED);
  }

  static declined() {
    return new FriendshipStatus(FriendshipStatus.DECLINED);
  }

  static blocked() {
    return new FriendshipStatus(FriendshipStatus.BLOCKED);
  }

  static fromString(value) {
    return new FriendshipStatus(value);
  }

  static isValid(value) {
    return FriendshipStatus.getAllValues().includes(value);
  }

  static getAllValues() {
    return [
      FriendshipStatus.PENDING,
      FriendshipStatus.ACCEPTED,
      FriendshipStatus.DECLINED,
      FriendshipStatus.BLOCKED,
    ];
  }

  canTransitionTo(targetStatus) {
    if (!(targetStatus instanceof FriendshipStatus)) {
      throw new TypeError('targetStatus must be a FriendshipStatus instance');
    }

    const allowedTransitions = FriendshipStatus.VALID_TRANSITIONS[this.#value];
    return allowedTransitions.includes(targetStatus.toString());
  }

  isPending() {
    return this.#value === FriendshipStatus.PENDING;
  }

  isAccepted() {
    return this.#value === FriendshipStatus.ACCEPTED;
  }

  isDeclined() {
    return this.#value === FriendshipStatus.DECLINED;
  }

  isBlocked() {
    return this.#value === FriendshipStatus.BLOCKED;
  }

  toString() {
    return this.#value;
  }

  equals(other) {
    if (!(other instanceof FriendshipStatus)) {
      return false;
    }
    return this.#value === other.#value;
  }
}

export default FriendshipStatus;
