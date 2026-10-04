/**
 * RyderCupSetup - Lo que solo tiene una Ryder Cup (FE #791).
 *
 * Como en el backend (RyderCupAm#471): los equipos y su reparto viven en una
 * pieza que la competición tiene o no tiene. Un Stableford no la tiene, así
 * que no hay campos de equipo vacíos ni comprobaciones del tipo repartidas por
 * las pantallas. Es inmutable: cambiar devuelve otra pieza.
 */
export class RyderCupSetup {
  #team1Name;
  #team2Name;
  #teamAssignment;

  /**
   * @param {Object} props
   * @param {string} props.team1Name
   * @param {string} props.team2Name
   * @param {import('./TeamAssignment').TeamAssignment|null} [props.teamAssignment]
   */
  constructor({ team1Name, team2Name, teamAssignment = null }) {
    RyderCupSetup.#validarNombres(team1Name, team2Name);
    this.#team1Name = team1Name;
    this.#team2Name = team2Name;
    this.#teamAssignment = teamAssignment;
    Object.freeze(this);
  }

  get team1Name() {
    return this.#team1Name;
  }

  get team2Name() {
    return this.#team2Name;
  }

  get teamAssignment() {
    return this.#teamAssignment;
  }

  /** Otra pieza con estos cambios; los nombres se validan otra vez. */
  with(cambios) {
    return new RyderCupSetup({
      team1Name: this.#team1Name,
      team2Name: this.#team2Name,
      teamAssignment: this.#teamAssignment,
      ...cambios,
    });
  }

  static #validarNombres(team1Name, team2Name) {
    if (typeof team1Name !== 'string' || team1Name.trim().length === 0) {
      throw new Error('Team 1 name cannot be empty.');
    }
    if (typeof team2Name !== 'string' || team2Name.trim().length === 0) {
      throw new Error('Team 2 name cannot be empty.');
    }
    if (team1Name.trim().toLowerCase() === team2Name.trim().toLowerCase()) {
      throw new Error('Team names must be different.');
    }
  }
}
