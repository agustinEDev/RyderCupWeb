// src/domain/entities/TeamAssignmentResult.js

export default class TeamAssignmentResult {
  #id;
  #competitionId;
  #mode;
  #teamAPlayerIds;
  #teamBPlayerIds;
  #createdAt;

  /**
   * @param {Object} props
   * @param {string} props.id
   * @param {string} props.competitionId
   * @param {string} props.mode - 'MANUAL' or 'AUTOMATIC'
   * @param {string[]} props.teamAPlayerIds
   * @param {string[]} props.teamBPlayerIds
   * @param {Date} props.createdAt
   */
  constructor({
    id,
    competitionId,
    mode,
    teamAPlayerIds = [],
    teamBPlayerIds = [],
    createdAt = new Date(),
  }) {
    this.#id = id;
    this.#competitionId = competitionId;
    this.#mode = mode;
    this.#teamAPlayerIds = [...teamAPlayerIds];
    this.#teamBPlayerIds = [...teamBPlayerIds];
    this.#createdAt = createdAt;
  }

  // --- GETTERS ---

  get id() { return this.#id; }
  get competitionId() { return this.#competitionId; }
  get mode() { return this.#mode; }
  get teamAPlayerIds() { return [...this.#teamAPlayerIds]; }
  get teamBPlayerIds() { return [...this.#teamBPlayerIds]; }
  get createdAt() { return this.#createdAt; }

  // --- QUERY METHODS ---

  isAutomatic() { return this.#mode === 'AUTOMATIC'; }
  isManual() { return this.#mode === 'MANUAL'; }
  getTeamSize() { return Math.max(this.#teamAPlayerIds.length, this.#teamBPlayerIds.length); }

  // --- STANDARD METHODS ---

  toString() {
    return `TeamAssignment (${this.#mode}) - ${this.getTeamSize()} per team`;
  }

  equals(other) {
    if (this === other) return true;
    if (!(other instanceof TeamAssignmentResult)) return false;
    return this.#id === other.#id;
  }
}
