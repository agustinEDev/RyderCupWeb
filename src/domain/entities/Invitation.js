import InvitationStatus from '../value_objects/InvitationStatus';

/**
 * Exception for invitation state errors
 */
export class InvitationStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvitationStateError';
  }
}

/**
 * Entity: Invitation
 *
 * Represents an invitation from a competition creator to a player.
 * Uses plain string IDs (not InvitationId VO), matching Match/Round pattern.
 *
 * Immutability: All state-changing methods return a NEW instance.
 */
class Invitation {
  #id;
  #competitionId;
  #inviterId;
  #inviteeEmail;
  #inviteeUserId;
  #status;
  #personalMessage;
  #expiresAt;
  #respondedAt;
  #createdAt;
  #updatedAt;

  constructor({
    id,
    competitionId,
    inviterId,
    inviteeEmail,
    inviteeUserId = null,
    status,
    personalMessage = null,
    expiresAt,
    respondedAt = null,
    createdAt = null,
    updatedAt = null,
  }) {
    if (!id || typeof id !== 'string') {
      throw new TypeError('id must be a non-empty string');
    }
    if (!competitionId || typeof competitionId !== 'string') {
      throw new TypeError('competitionId must be a non-empty string');
    }
    if (!inviterId || typeof inviterId !== 'string') {
      throw new TypeError('inviterId must be a non-empty string');
    }
    if (!inviteeEmail || typeof inviteeEmail !== 'string') {
      throw new TypeError('inviteeEmail must be a non-empty string');
    }
    if (!(status instanceof InvitationStatus)) {
      throw new TypeError('status must be an InvitationStatus instance');
    }

    this.#id = id;
    this.#competitionId = competitionId;
    this.#inviterId = inviterId;
    this.#inviteeEmail = inviteeEmail;
    this.#inviteeUserId = inviteeUserId;
    this.#status = status;
    this.#personalMessage = personalMessage;
    this.#expiresAt = expiresAt ? new Date(expiresAt) : null;
    this.#respondedAt = respondedAt ? new Date(respondedAt) : null;
    this.#createdAt = createdAt ? new Date(createdAt) : new Date();
    this.#updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // === Factory Methods ===

  static create({
    id,
    competitionId,
    inviterId,
    inviteeEmail,
    inviteeUserId = null,
    personalMessage = null,
    expiresAt,
  }) {
    return new Invitation({
      id,
      competitionId,
      inviterId,
      inviteeEmail,
      inviteeUserId,
      status: InvitationStatus.pending(),
      personalMessage,
      expiresAt,
    });
  }

  static fromPersistence(props) {
    return new Invitation(props);
  }

  // === Getters ===

  get id() {
    return this.#id;
  }

  get competitionId() {
    return this.#competitionId;
  }

  get inviterId() {
    return this.#inviterId;
  }

  get inviteeEmail() {
    return this.#inviteeEmail;
  }

  get inviteeUserId() {
    return this.#inviteeUserId;
  }

  get status() {
    return this.#status;
  }

  get personalMessage() {
    return this.#personalMessage;
  }

  get expiresAt() {
    return this.#expiresAt;
  }

  get respondedAt() {
    return this.#respondedAt;
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  // === Query Methods ===

  isPending() {
    return this.#status.isPending();
  }

  isAccepted() {
    return this.#status.isAccepted();
  }

  isDeclined() {
    return this.#status.isDeclined();
  }

  isExpired() {
    return this.#status.isExpired();
  }

  isTerminal() {
    return this.#status.isTerminal();
  }

  hasInviteeUser() {
    return this.#inviteeUserId !== null;
  }

  // === Command Methods (return new instances) ===

  accept() {
    this.#status.validateTransition(InvitationStatus.accepted());

    return new Invitation({
      id: this.#id,
      competitionId: this.#competitionId,
      inviterId: this.#inviterId,
      inviteeEmail: this.#inviteeEmail,
      inviteeUserId: this.#inviteeUserId,
      status: InvitationStatus.accepted(),
      personalMessage: this.#personalMessage,
      expiresAt: this.#expiresAt,
      respondedAt: new Date(),
      createdAt: this.#createdAt,
      updatedAt: new Date(),
    });
  }

  decline() {
    this.#status.validateTransition(InvitationStatus.declined());

    return new Invitation({
      id: this.#id,
      competitionId: this.#competitionId,
      inviterId: this.#inviterId,
      inviteeEmail: this.#inviteeEmail,
      inviteeUserId: this.#inviteeUserId,
      status: InvitationStatus.declined(),
      personalMessage: this.#personalMessage,
      expiresAt: this.#expiresAt,
      respondedAt: new Date(),
      createdAt: this.#createdAt,
      updatedAt: new Date(),
    });
  }

  // === Serialization ===

  toPersistence() {
    return {
      id: this.#id,
      competitionId: this.#competitionId,
      inviterId: this.#inviterId,
      inviteeEmail: this.#inviteeEmail,
      inviteeUserId: this.#inviteeUserId,
      status: this.#status.toString(),
      personalMessage: this.#personalMessage,
      expiresAt: this.#expiresAt?.toISOString() || null,
      respondedAt: this.#respondedAt?.toISOString() || null,
      createdAt: this.#createdAt.toISOString(),
      updatedAt: this.#updatedAt.toISOString(),
    };
  }

  equals(other) {
    if (!(other instanceof Invitation)) {
      return false;
    }
    return this.#id === other.#id;
  }

  toString() {
    return `Invitation(${this.#id}, Competition: ${this.#competitionId}, Invitee: ${this.#inviteeEmail}, Status: ${this.#status.toString()})`;
  }
}

export default Invitation;
