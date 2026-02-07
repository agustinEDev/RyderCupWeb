// src/domain/entities/Round.js

import { RoundStatus } from '../value_objects/RoundStatus';

export default class Round {
  #id;
  #competitionId;
  #golfCourseId;
  #roundDate;
  #sessionType;
  #matchFormat;
  #handicapMode;
  #allowancePercentage;
  #effectiveAllowance;
  #status;
  #matches;
  #createdAt;
  #updatedAt;

  constructor({
    id,
    competitionId,
    golfCourseId,
    roundDate,
    sessionType,
    matchFormat,
    handicapMode = null,
    allowancePercentage = null,
    effectiveAllowance = null,
    status = RoundStatus.PENDING_TEAMS,
    matches = [],
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.#id = id;
    this.#competitionId = competitionId;
    this.#golfCourseId = golfCourseId;
    this.#roundDate = roundDate;
    this.#sessionType = sessionType;
    this.#matchFormat = matchFormat;
    this.#handicapMode = handicapMode;
    this.#allowancePercentage = allowancePercentage;
    this.#effectiveAllowance = effectiveAllowance;
    this.#status = status;
    this.#matches = [...matches];
    this.#createdAt = createdAt;
    this.#updatedAt = updatedAt;
  }

  // --- GETTERS ---

  get id() { return this.#id; }
  get competitionId() { return this.#competitionId; }
  get golfCourseId() { return this.#golfCourseId; }
  get roundDate() { return this.#roundDate; }
  get sessionType() { return this.#sessionType; }
  get matchFormat() { return this.#matchFormat; }
  get handicapMode() { return this.#handicapMode; }
  get allowancePercentage() { return this.#allowancePercentage; }
  get effectiveAllowance() { return this.#effectiveAllowance; }
  get status() { return this.#status; }
  get matches() { return [...this.#matches]; }
  get createdAt() { return this.#createdAt; }
  get updatedAt() { return this.#updatedAt; }

  // --- QUERY METHODS ---

  isEditable() {
    return this.#status.isEditable();
  }

  hasMatches() {
    return this.#matches.length > 0;
  }

  matchCount() {
    return this.#matches.length;
  }

  // --- STANDARD METHODS ---

  toString() {
    return `Round ${this.#roundDate} (${this.#status.toString()})`;
  }

  equals(other) {
    if (this === other) return true;
    if (!(other instanceof Round)) return false;
    return this.#id === other.#id;
  }
}
