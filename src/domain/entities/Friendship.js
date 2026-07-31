import FriendshipStatus from '../value_objects/FriendshipStatus';

/**
 * Entity: Friendship
 *
 * Represents a friendship relationship between two users.
 * Uses plain string IDs, matching Invitation entity pattern.
 *
 * Immutability: All state-changing methods return a NEW instance.
 */
class Friendship {
  #id;
  #requesterId;
  #addresseeId;
  #status;
  #respondedAt;
  #createdAt;
  #updatedAt;

  constructor({
    id,
    requesterId,
    addresseeId,
    status,
    respondedAt = null,
    createdAt = null,
    updatedAt = null,
  }) {
    if (!id || typeof id !== 'string') {
      throw new TypeError('id must be a non-empty string');
    }
    if (!requesterId || typeof requesterId !== 'string') {
      throw new TypeError('requesterId must be a non-empty string');
    }
    if (!addresseeId || typeof addresseeId !== 'string') {
      throw new TypeError('addresseeId must be a non-empty string');
    }
    if (!(status instanceof FriendshipStatus)) {
      throw new TypeError('status must be a FriendshipStatus instance');
    }

    this.#id = id;
    this.#requesterId = requesterId;
    this.#addresseeId = addresseeId;
    this.#status = status;
    this.#respondedAt = respondedAt ? new Date(respondedAt) : null;
    this.#createdAt = createdAt ? new Date(createdAt) : new Date();
    this.#updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // === Factory Methods ===

  static fromPersistence(props) {
    return new Friendship(props);
  }

  // === Getters ===

  get id() {
    return this.#id;
  }

  get requesterId() {
    return this.#requesterId;
  }

  get addresseeId() {
    return this.#addresseeId;
  }

  get status() {
    return this.#status;
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

  isBlocked() {
    return this.#status.isBlocked();
  }

  involvesUser(userId) {
    return this.#requesterId === userId || this.#addresseeId === userId;
  }

  otherUserId(userId) {
    if (this.#requesterId === userId) return this.#addresseeId;
    if (this.#addresseeId === userId) return this.#requesterId;
    return null;
  }

  // === Serialization ===

  toPersistence() {
    return {
      id: this.#id,
      requesterId: this.#requesterId,
      addresseeId: this.#addresseeId,
      status: this.#status.toString(),
      respondedAt: this.#respondedAt?.toISOString() || null,
      createdAt: this.#createdAt.toISOString(),
      updatedAt: this.#updatedAt.toISOString(),
    };
  }

  equals(other) {
    if (!(other instanceof Friendship)) {
      return false;
    }
    return this.#id === other.#id;
  }

  toString() {
    return `Friendship(${this.#id}, ${this.#requesterId} -> ${this.#addresseeId}, ${this.#status.toString()})`;
  }
}

export default Friendship;
