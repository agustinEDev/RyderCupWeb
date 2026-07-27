import QuickMatchStatus from '../value_objects/QuickMatchStatus';

const VALID_MATCH_FORMATS = ['SINGLES', 'FOURBALL', 'FOURSOMES'];
const VALID_SCORING_FORMATS = ['MEDAL', 'STABLEFORD'];
const MAX_NAME_LENGTH = 100;

/**
 * Entity: QuickMatch
 *
 * Represents an informal match between friends, without a full tournament.
 * Participants are embedded plain data (registered friends or guests without
 * an account), matching the backend's read model (no separate aggregate).
 *
 * Immutability: All state-changing methods return a NEW instance.
 */
class QuickMatch {
  #id;
  #creatorId;
  #golfCourseId;
  #matchFormat;
  #scoringFormat;
  #status;
  #name;
  #participants;
  #scorerIds;
  #holeScores;
  #standing;
  #scoringAssignments;
  #createdAt;
  #updatedAt;

  constructor({
    id,
    creatorId,
    golfCourseId,
    matchFormat = null,
    scoringFormat = null,
    status,
    name = null,
    participants = [],
    scorerIds = [],
    holeScores = [],
    standing = null,
    scoringAssignments = [],
    createdAt = null,
    updatedAt = null,
  }) {
    if (!id || typeof id !== 'string') {
      throw new TypeError('id must be a non-empty string');
    }
    if (!creatorId || typeof creatorId !== 'string') {
      throw new TypeError('creatorId must be a non-empty string');
    }
    if (!golfCourseId || typeof golfCourseId !== 'string') {
      throw new TypeError('golfCourseId must be a non-empty string');
    }
    if ((matchFormat == null) === (scoringFormat == null)) {
      throw new TypeError('Exactly one of matchFormat or scoringFormat must be provided');
    }
    if (matchFormat != null && !VALID_MATCH_FORMATS.includes(matchFormat)) {
      throw new TypeError(`Invalid matchFormat: ${matchFormat}`);
    }
    if (scoringFormat != null && !VALID_SCORING_FORMATS.includes(scoringFormat)) {
      throw new TypeError(`Invalid scoringFormat: ${scoringFormat}`);
    }
    if (name != null && (typeof name !== 'string' || name.length > MAX_NAME_LENGTH)) {
      throw new TypeError(`name must be a string of at most ${MAX_NAME_LENGTH} characters`);
    }
    if (!(status instanceof QuickMatchStatus)) {
      throw new TypeError('status must be a QuickMatchStatus instance');
    }

    this.#id = id;
    this.#creatorId = creatorId;
    this.#golfCourseId = golfCourseId;
    this.#matchFormat = matchFormat;
    this.#scoringFormat = scoringFormat;
    this.#status = status;
    this.#name = name;
    this.#participants = participants;
    this.#scorerIds = scorerIds;
    this.#holeScores = holeScores;
    this.#standing = standing;
    this.#scoringAssignments = scoringAssignments;
    this.#createdAt = createdAt ? new Date(createdAt) : new Date();
    this.#updatedAt = updatedAt ? new Date(updatedAt) : new Date();
  }

  // === Factory Methods ===

  static fromPersistence(props) {
    return new QuickMatch(props);
  }

  // === Getters ===

  get id() {
    return this.#id;
  }

  get creatorId() {
    return this.#creatorId;
  }

  get golfCourseId() {
    return this.#golfCourseId;
  }

  get matchFormat() {
    return this.#matchFormat;
  }

  get scoringFormat() {
    return this.#scoringFormat;
  }

  get status() {
    return this.#status;
  }

  get name() {
    return this.#name;
  }

  get participants() {
    return this.#participants;
  }

  get scorerIds() {
    return this.#scorerIds;
  }

  get holeScores() {
    return this.#holeScores;
  }

  get standing() {
    return this.#standing;
  }

  get scoringAssignments() {
    return this.#scoringAssignments;
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

  isInProgress() {
    return this.#status.isInProgress();
  }

  isCompleted() {
    return this.#status.isCompleted();
  }

  isCancelled() {
    return this.#status.isCancelled();
  }

  isCreator(userId) {
    return this.#creatorId === userId;
  }

  isScorer(participantId) {
    return this.#scorerIds.includes(participantId);
  }

  findParticipant(participantId) {
    return this.#participants.find((p) => p.participantId === participantId) || null;
  }

  findParticipantByUserId(userId) {
    return this.#participants.find((p) => p.userId === userId) || null;
  }

  // === Serialization ===

  toPersistence() {
    return {
      id: this.#id,
      creatorId: this.#creatorId,
      golfCourseId: this.#golfCourseId,
      matchFormat: this.#matchFormat,
      scoringFormat: this.#scoringFormat,
      status: this.#status.toString(),
      name: this.#name,
      participants: this.#participants,
      scorerIds: this.#scorerIds,
      holeScores: this.#holeScores,
      standing: this.#standing,
      scoringAssignments: this.#scoringAssignments,
      createdAt: this.#createdAt.toISOString(),
      updatedAt: this.#updatedAt.toISOString(),
    };
  }

  equals(other) {
    if (!(other instanceof QuickMatch)) {
      return false;
    }
    return this.#id === other.#id;
  }

  toString() {
    const format = this.#matchFormat ?? this.#scoringFormat;
    return `QuickMatch(${this.#id}, ${format}, ${this.#status.toString()})`;
  }
}

export default QuickMatch;
