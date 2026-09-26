/**
 * Value Object: InvitationStatus
 *
 * Represents the status of an invitation.
 * Compatible with backend Python: InvitationStatus (Enum).
 *
 * States:
 * - PENDING: Invitation sent, awaiting response
 * - ACCEPTED: Invitee accepted the invitation
 * - DECLINED: Invitee declined the invitation
 * - EXPIRED: Invitation expired (7-day TTL)
 * - NO_ROOM: Enrolment closed while it was pending (RyderCupWeb#710)
 *
 * Transitions:
 * - PENDING -> ACCEPTED | DECLINED | EXPIRED | NO_ROOM
 * - ACCEPTED, DECLINED, EXPIRED, NO_ROOM -> (terminal states)
 */
class InvitationStatus {
  static PENDING = 'PENDING';
  static ACCEPTED = 'ACCEPTED';
  static DECLINED = 'DECLINED';
  static EXPIRED = 'EXPIRED';
  // Al cerrar la inscripción, las pendientes se quedan sin plaza (#710)
  static NO_ROOM = 'NO_ROOM';

  static VALID_TRANSITIONS = {
    [InvitationStatus.PENDING]: [
      InvitationStatus.ACCEPTED,
      InvitationStatus.DECLINED,
      InvitationStatus.EXPIRED,
      InvitationStatus.NO_ROOM,
    ],
    [InvitationStatus.ACCEPTED]: [],
    [InvitationStatus.DECLINED]: [],
    [InvitationStatus.EXPIRED]: [],
    [InvitationStatus.NO_ROOM]: [],
  };

  #value;

  constructor(value) {
    if (!InvitationStatus.isValid(value)) {
      throw new Error(
        `Invalid InvitationStatus: ${value}. ` +
          `Valid values: ${InvitationStatus.getAllValues().join(', ')}`
      );
    }
    this.#value = value;
  }

  static pending() {
    return new InvitationStatus(InvitationStatus.PENDING);
  }

  static accepted() {
    return new InvitationStatus(InvitationStatus.ACCEPTED);
  }

  static declined() {
    return new InvitationStatus(InvitationStatus.DECLINED);
  }

  static expired() {
    return new InvitationStatus(InvitationStatus.EXPIRED);
  }

  static fromString(value) {
    return new InvitationStatus(value);
  }

  static isValid(value) {
    return InvitationStatus.getAllValues().includes(value);
  }

  static getAllValues() {
    return [
      InvitationStatus.PENDING,
      InvitationStatus.ACCEPTED,
      InvitationStatus.DECLINED,
      InvitationStatus.EXPIRED,
      InvitationStatus.NO_ROOM,
    ];
  }

  canTransitionTo(targetStatus) {
    if (!(targetStatus instanceof InvitationStatus)) {
      throw new TypeError('targetStatus must be an InvitationStatus instance');
    }

    const allowedTransitions = InvitationStatus.VALID_TRANSITIONS[this.#value];
    return allowedTransitions.includes(targetStatus.toString());
  }

  validateTransition(targetStatus) {
    if (!this.canTransitionTo(targetStatus)) {
      throw new Error(
        `Invalid transition: ${this.#value} -> ${targetStatus.toString()}. ` +
          `Allowed transitions: ${InvitationStatus.VALID_TRANSITIONS[this.#value].join(', ') || 'none'}`
      );
    }
  }

  isPending() {
    return this.#value === InvitationStatus.PENDING;
  }

  isAccepted() {
    return this.#value === InvitationStatus.ACCEPTED;
  }

  isDeclined() {
    return this.#value === InvitationStatus.DECLINED;
  }

  isExpired() {
    return this.#value === InvitationStatus.EXPIRED;
  }

  isTerminal() {
    return (
      this.#value === InvitationStatus.ACCEPTED ||
      this.#value === InvitationStatus.DECLINED ||
      this.#value === InvitationStatus.EXPIRED ||
      this.#value === InvitationStatus.NO_ROOM
    );
  }

  toString() {
    return this.#value;
  }

  equals(other) {
    if (!(other instanceof InvitationStatus)) {
      return false;
    }
    return this.#value === other.#value;
  }
}

export default InvitationStatus;
