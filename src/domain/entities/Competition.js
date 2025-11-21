// src/domain/entities/Competition.js

import { CompetitionStatus } from '../value_objects/CompetitionStatus';
import { InvalidLocationError } from '../value_objects/InvalidLocationError'; // Though not thrown here, good to be aware.

// Assuming UserId exists in a shared or user-specific value_objects folder.
// We might need to adjust this path later.
// For now, let's create a placeholder to make the code work.
class UserId {
  constructor(value) { this.id = value; }
  equals(other) { return other instanceof UserId && this.id === other.id; }
}


/**
 * Custom error for invalid state transitions in a Competition.
 */
export class CompetitionStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CompetitionStateError';
  }
}

export class Competition {
  #id;
  #creatorId;
  #name;
  #dates;
  #location;
  #team1Name;
  #team2Name;
  #handicapSettings;
  #maxPlayers;
  #teamAssignment;
  #status;
  #createdAt;
  #updatedAt;

  constructor({
    id,
    creatorId,
    name,
    dates,
    location,
    team1Name,
    team2Name,
    handicapSettings,
    maxPlayers = 24,
    teamAssignment,
    status = CompetitionStatus.DRAFT,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    // Validate team names invariant
    Competition._validateTeamNames(team1Name, team2Name);

    this.#id = id;
    this.#creatorId = creatorId;
    this.#name = name;
    this.#dates = dates;
    this.#location = location;
    this.#team1Name = team1Name;
    this.#team2Name = team2Name;
    this.#handicapSettings = handicapSettings;
    this.#maxPlayers = maxPlayers;
    this.#teamAssignment = teamAssignment;
    this.#status = status;
    this.#createdAt = createdAt;
    this.#updatedAt = updatedAt;

    // Object.freeze(this);
  }

  static create({
    id,
    creatorId,
    name,
    dates,
    location,
    team1Name,
    team2Name,
    handicapSettings,
    maxPlayers = 24,
    teamAssignment,
  }) {
    return new Competition({
      id,
      creatorId,
      name,
      dates,
      location,
      team1Name,
      team2Name,
      handicapSettings,
      maxPlayers,
      teamAssignment,
      status: CompetitionStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // --- PRIVATE VALIDATORS ---

  static _validateTeamNames(team1Name, team2Name) {
    if (typeof team1Name !== 'string' || team1Name.trim().length === 0) {
      throw new Error("Team 1 name cannot be empty.");
    }
    if (typeof team2Name !== 'string' || team2Name.trim().length === 0) {
      throw new Error("Team 2 name cannot be empty.");
    }
    if (team1Name.trim().toLowerCase() === team2Name.trim().toLowerCase()) {
      throw new Error("Team names must be different.");
    }
  }

  // --- GETTERS ---

  get id() { return this.#id; }
  get creatorId() { return this.#creatorId; }
  get name() { return this.#name; }
  get dates() { return this.#dates; }
  get location() { return this.#location; }
  get team1Name() { return this.#team1Name; }
  get team2Name() { return this.#team2Name; }
  get handicapSettings() { return this.#handicapSettings; }
  get maxPlayers() { return this.#maxPlayers; }
  get teamAssignment() { return this.#teamAssignment; }
  get status() { return this.#status; }
  get createdAt() { return this.#createdAt; }
  get updatedAt() { return this.#updatedAt; }

  // --- QUERY METHODS ---

  isCreator(userId) {
    return this.#creatorId.equals(userId);
  }
  
  isDraft = () => this.#status.equals(CompetitionStatus.DRAFT);
  isActive = () => this.#status.equals(CompetitionStatus.ACTIVE);
  isClosed = () => this.#status.equals(CompetitionStatus.CLOSED);
  isInProgress = () => this.#status.equals(CompetitionStatus.IN_PROGRESS);
  isCompleted = () => this.#status.equals(CompetitionStatus.COMPLETED);
  isCancelled = () => this.#status.equals(CompetitionStatus.CANCELLED);
  
  allowsEnrollments = () => this.isActive();
  allowsModifications = () => this.isDraft();

  // --- COMMAND METHODS ---

  activate() {
    if (!this.#status.canTransitionTo(CompetitionStatus.ACTIVE)) {
      throw new CompetitionStateError(`Cannot activate a competition in state ${this.#status.toString()}`);
    }
    return this._with({ status: CompetitionStatus.ACTIVE, updatedAt: new Date() });
  }

  closeEnrollments() {
    if (!this.#status.canTransitionTo(CompetitionStatus.CLOSED)) {
      throw new CompetitionStateError(`Cannot close enrollments in state ${this.#status.toString()}`);
    }
    return this._with({ status: CompetitionStatus.CLOSED, updatedAt: new Date() });
  }

  start() {
    if (!this.#status.canTransitionTo(CompetitionStatus.IN_PROGRESS)) {
      throw new CompetitionStateError(`Cannot start a competition in state ${this.#status.toString()}`);
    }
    return this._with({ status: CompetitionStatus.IN_PROGRESS, updatedAt: new Date() });
  }

  complete() {
    if (!this.#status.canTransitionTo(CompetitionStatus.COMPLETED)) {
      throw new CompetitionStateError(`Cannot complete a competition in state ${this.#status.toString()}`);
    }
    return this._with({ status: CompetitionStatus.COMPLETED, updatedAt: new Date() });
  }

  cancel() {
    if (this.#status.isFinal()) {
      throw new CompetitionStateError(`Cannot cancel a competition in a final state: ${this.#status.toString()}`);
    }
    if (!this.#status.canTransitionTo(CompetitionStatus.CANCELLED)) {
      // This is defensive, as isFinal() should already catch COMPLETED and CANCELLED
      throw new CompetitionStateError(`Cannot cancel from state ${this.#status.toString()}`);
    }
    return this._with({ status: CompetitionStatus.CANCELLED, updatedAt: new Date() });
  }

  updateInfo(updates) {
    if (!this.allowsModifications()) {
      throw new CompetitionStateError(`Cannot modify competition info in state ${this.#status.toString()}. Only allowed in DRAFT.`);
    }

    const currentProps = {
      name: this.#name,
      dates: this.#dates,
      location: this.#location,
      team1Name: this.#team1Name,
      team2Name: this.#team2Name,
      handicapSettings: this.#handicapSettings,
      maxPlayers: this.#maxPlayers,
      teamAssignment: this.#teamAssignment,
    };

    const newProps = { ...currentProps, ...updates };

    // Re-validate team names if they are part of the update
    Competition._validateTeamNames(newProps.team1Name, newProps.team2Name);
    
    // Validate maxPlayers range if updated
    if (updates.maxPlayers !== undefined) {
      if (typeof updates.maxPlayers !== 'number' || updates.maxPlayers < 2 || updates.maxPlayers > 100) {
        throw new Error("maxPlayers must be a number between 2 and 100.");
      }
    }

    return this._with({ ...newProps, updatedAt: new Date() });
  }

  // --- IMMUTABILITY HELPER ---

  _with(newValues) {
    const allProps = {
      id: this.#id,
      creatorId: this.#creatorId,
      name: this.#name,
      dates: this.#dates,
      location: this.#location,
      team1Name: this.#team1Name,
      team2Name: this.#team2Name,
      handicapSettings: this.#handicapSettings,
      maxPlayers: this.#maxPlayers,
      teamAssignment: this.#teamAssignment,
      status: this.#status,
      createdAt: this.#createdAt,
      updatedAt: this.#updatedAt,
      ...newValues,
    };
    return new Competition(allProps);
  }

  // --- STANDARD METHODS ---

  toString() {
    return `${this.#name.toString()} (${this.#status.toString()})`;
  }

  equals(other) {
    if (this === other) return true;
    if (!(other instanceof Competition)) return false;
    return this.#id.equals(other.#id);
  }
}
