// src/domain/entities/Competition.js

import { CompetitionStatus } from '../value_objects/CompetitionStatus';
import { tieneEquipos } from '../value_objects/TournamentType';
import { RyderCupSetup } from '../value_objects/RyderCupSetup';

// Cuántos inscritos admite, el mismo rango que la API (`ge=2`, `le=200` desde
// la BE #314: antes eran 100 por un límite oculto al leer inscripciones)
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 200;

const comprobarCupo = (maxPlayers) => {
  if (typeof maxPlayers !== 'number' || maxPlayers < MIN_PLAYERS || maxPlayers > MAX_PLAYERS) {
    throw new Error(`maxPlayers must be a number between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`);
  }
};

/**
 * Custom error for invalid state transitions in a Competition.
 */
export class CompetitionStateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CompetitionStateError';
  }
}

export default class Competition {
  #id;
  #creatorId;
  #name;
  #dates;
  #location;
  #handicapSettings;
  #maxPlayers;
  #visibility;
  #ryderCup;
  #tournamentType;
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
    visibility = 'PRIVATE',
    teamAssignment,
    status = CompetitionStatus.DRAFT,
    createdAt = new Date(),
    updatedAt = new Date(),
    tournamentType = 'RYDER_CUP',
    ryderCup,
  }) {
    // Lo que solo tiene una Ryder Cup vive en su pieza, como en el backend
    // (FE #791, RyderCupAm#471): un Stableford no la tiene. Se recibe hecha
    // (al copiarse a sí misma) o se construye con sus campos
    this.#tournamentType = tournamentType;
    if (ryderCup !== undefined) {
      Competition.#comprobarLaPieza(tournamentType, ryderCup);
      this.#ryderCup = ryderCup;
    } else {
      this.#ryderCup = tieneEquipos(tournamentType)
        ? new RyderCupSetup({ team1Name, team2Name, teamAssignment })
        : null;
    }

    this.#id = id;
    this.#creatorId = creatorId;
    this.#name = name;
    this.#dates = dates;
    this.#location = location;
    this.#handicapSettings = handicapSettings;
    this.#maxPlayers = maxPlayers;
    this.#visibility = visibility;
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
    tournamentType = 'RYDER_CUP',
  }) {
    // El mismo rango que al editar: solo lo miraba `updateInfo`
    comprobarCupo(maxPlayers);
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
      tournamentType,
      status: CompetitionStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /** Qué torneo es: RYDER_CUP, STABLEFORD o MEDAL (RyderCupAm#251). */
  get tournamentType() {
    return this.#tournamentType;
  }

  /**
   * El tipo y la pieza tienen que cuadrar: una Ryder tiene la suya y los
   * demás no tienen ninguna. Un tipo que todavía no conocemos se admite, sin
   * equipos: la ficha tiene que poder enseñar uno que el backend añada mañana.
   */
  static #comprobarLaPieza(tournamentType, ryderCup) {
    if (ryderCup !== null && !(ryderCup instanceof RyderCupSetup)) {
      throw new Error('ryderCup tiene que ser una RyderCupSetup o null');
    }
    if (tieneEquipos(tournamentType) && ryderCup === null) {
      throw new Error('Una Ryder Cup tiene equipos');
    }
    if (!tieneEquipos(tournamentType) && ryderCup !== null) {
      throw new Error(`Un ${tournamentType} no tiene equipos`);
    }
  }

  /** Los equipos y su reparto, o null si el torneo no los tiene. */
  get ryderCup() {
    return this.#ryderCup;
  }

  /** Si se juega entre dos equipos: si tiene la pieza de la Ryder. */
  get hasTeams() {
    return this.#ryderCup !== null;
  }


  // --- GETTERS ---

  get id() { return this.#id; }
  get creatorId() { return this.#creatorId; }
  get name() { return this.#name; }
  get dates() { return this.#dates; }
  get location() { return this.#location; }
  get handicapSettings() { return this.#handicapSettings; }
  /** Quién puede ver el torneo y pedir sitio: PRIVATE o PUBLIC (FE #664). */
  get visibility() {
    return this.#visibility;
  }

  get maxPlayers() { return this.#maxPlayers; }
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

    // Los equipos y el reparto son de la pieza de la Ryder: un torneo sin ella
    // no los recibe, y la pieza valida sus nombres al cambiar (FE #791)
    const { team1Name, team2Name, teamAssignment, ...resto } = updates;
    // El tipo de una competición que ya existe no cambia: tampoco aquí
    if (resto.tournamentType !== undefined && resto.tournamentType !== this.#tournamentType) {
      throw new Error('El tipo de una competición no se cambia');
    }
    const cambiosDeLaRyder = Object.fromEntries(
      Object.entries({ team1Name, team2Name, teamAssignment }).filter(([, v]) => v !== undefined)
    );
    let ryderCup = this.#ryderCup;
    if (Object.keys(cambiosDeLaRyder).length > 0) {
      if (ryderCup === null) {
        throw new Error(`Un ${this.#tournamentType} no tiene equipos`);
      }
      ryderCup = ryderCup.with(cambiosDeLaRyder);
    }

    const currentProps = {
      name: this.#name,
      dates: this.#dates,
      location: this.#location,
      handicapSettings: this.#handicapSettings,
      maxPlayers: this.#maxPlayers,
      visibility: this.#visibility,
    };

    const newProps = { ...currentProps, ...resto, ryderCup };
    
    // Validate maxPlayers range if updated
    if (updates.maxPlayers !== undefined) {
      comprobarCupo(updates.maxPlayers);
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
      handicapSettings: this.#handicapSettings,
      maxPlayers: this.#maxPlayers,
      visibility: this.#visibility,
      // El tipo y la pieza viajan con la copia: sin ellos, activar un Stableford
      // lo convertía en una Ryder sin equipos y fallaba (FE #791)
      tournamentType: this.#tournamentType,
      ryderCup: this.#ryderCup,
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
