// src/domain/entities/Match.js

import { MatchStatus } from '../value_objects/MatchStatus';

export default class Match {
  #id;
  #roundId;
  #matchNumber;
  #teamAPlayers;
  #teamBPlayers;
  #status;
  #handicapStrokesGiven;
  #strokesGivenToTeam;
  #result;
  #createdAt;
  #updatedAt;

  /**
   * @param {Object} props
   * @param {string} props.id
   * @param {string} props.roundId
   * @param {number} props.matchNumber
   * @param {Array} props.teamAPlayers - [{userId, playingHandicap, teeCategory, strokesReceived}]
   * @param {Array} props.teamBPlayers - [{userId, playingHandicap, teeCategory, strokesReceived}]
   * @param {MatchStatus} props.status
   * @param {?number} props.handicapStrokesGiven
   * @param {?string} props.strokesGivenToTeam - 'A' or 'B' or null
   * @param {?string} props.result
   * @param {Date} props.createdAt
   * @param {Date} props.updatedAt
   */
  constructor({
    id,
    roundId,
    matchNumber,
    teamAPlayers = [],
    teamBPlayers = [],
    status = MatchStatus.SCHEDULED,
    handicapStrokesGiven = null,
    strokesGivenToTeam = null,
    result = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.#id = id;
    this.#roundId = roundId;
    this.#matchNumber = matchNumber;
    this.#teamAPlayers = [...teamAPlayers];
    this.#teamBPlayers = [...teamBPlayers];
    this.#status = status;
    this.#handicapStrokesGiven = handicapStrokesGiven;
    this.#strokesGivenToTeam = strokesGivenToTeam;
    this.#result = result;
    this.#createdAt = createdAt;
    this.#updatedAt = updatedAt;
  }

  // --- GETTERS ---

  get id() { return this.#id; }
  get roundId() { return this.#roundId; }
  get matchNumber() { return this.#matchNumber; }
  get teamAPlayers() { return [...this.#teamAPlayers]; }
  get teamBPlayers() { return [...this.#teamBPlayers]; }
  get status() { return this.#status; }
  get handicapStrokesGiven() { return this.#handicapStrokesGiven; }
  get strokesGivenToTeam() { return this.#strokesGivenToTeam; }
  get result() { return this.#result; }
  get createdAt() { return this.#createdAt; }
  get updatedAt() { return this.#updatedAt; }

  // --- QUERY METHODS ---

  isScheduled() { return this.#status.equals(MatchStatus.SCHEDULED); }
  isInProgress() { return this.#status.equals(MatchStatus.IN_PROGRESS); }
  isCompleted() { return this.#status.equals(MatchStatus.COMPLETED); }
  isWalkover() { return this.#status.equals(MatchStatus.WALKOVER); }

  canStart() { return this.#status.canTransitionTo(MatchStatus.IN_PROGRESS); }
  canComplete() { return this.#status.canTransitionTo(MatchStatus.COMPLETED); }

  // --- STANDARD METHODS ---

  toString() {
    return `Match #${this.#matchNumber} (${this.#status.toString()})`;
  }

  equals(other) {
    if (this === other) return true;
    if (!(other instanceof Match)) return false;
    return this.#id === other.#id;
  }
}
