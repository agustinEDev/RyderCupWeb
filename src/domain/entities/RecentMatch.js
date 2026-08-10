/**
 * Entity: RecentMatch
 *
 * Una entrada del historial de partidas, ya sea de torneo o partida rápida.
 *
 * Casi todo es opcional porque unifica dos cosas que no son iguales: un partido
 * de torneo tiene rival y nombre de competición; una partida libre no tiene ni
 * lo uno ni lo otro. `matchFormat` y `scoringFormat` son ejes distintos y
 * mutuamente excluyentes en el dominio, no dos nombres para lo mismo.
 */
class RecentMatch {
  #id;
  #date;
  #matchFormat;
  #scoringFormat;
  #golfCourseId;
  #golfCourseName;
  #tournamentName;
  #result;
  #score;
  #stablefordPoints;
  #partners;
  #opponents;

  constructor({
    id,
    date = null,
    matchFormat = null,
    scoringFormat = null,
    golfCourseId = null,
    golfCourseName = null,
    tournamentName = null,
    result = null,
    score = null,
    stablefordPoints = null,
    partners = [],
    opponents = [],
  }) {
    if (!id || typeof id !== 'string') {
      throw new TypeError('id must be a non-empty string');
    }

    this.#id = id;
    this.#date = date ? new Date(date) : null;
    this.#matchFormat = matchFormat;
    this.#scoringFormat = scoringFormat;
    this.#golfCourseId = golfCourseId;
    this.#golfCourseName = golfCourseName;
    this.#tournamentName = tournamentName;
    this.#result = result;
    this.#score = score;
    this.#stablefordPoints = stablefordPoints;
    this.#partners = Object.freeze([...partners]);
    this.#opponents = Object.freeze([...opponents]);
  }

  static fromPersistence(props) {
    return new RecentMatch(props);
  }

  get id() {
    return this.#id;
  }

  get date() {
    return this.#date;
  }

  get matchFormat() {
    return this.#matchFormat;
  }

  get scoringFormat() {
    return this.#scoringFormat;
  }

  get golfCourseId() {
    return this.#golfCourseId;
  }

  get golfCourseName() {
    return this.#golfCourseName;
  }

  get tournamentName() {
    return this.#tournamentName;
  }

  get result() {
    return this.#result;
  }

  get score() {
    return this.#score;
  }

  get stablefordPoints() {
    return this.#stablefordPoints;
  }

  get partners() {
    return this.#partners;
  }

  get opponents() {
    return this.#opponents;
  }

  // === Business Rules ===

  /**
   * Si viene de un torneo.
   *
   * Se decide por el nombre del torneo y no por el formato: una partida rápida
   * también puede jugarse en formato SINGLES, así que el formato no distingue
   * de dónde salió.
   */
  isFromTournament() {
    return this.#tournamentName !== null && this.#tournamentName !== undefined;
  }

  /**
   * Si el partido se adjudicó a alguien, que solo pasa en match play.
   *
   * Una vuelta de medal o Stableford tiene marcador pero no ganador: no se
   * juega contra un rival concreto.
   */
  hasResult() {
    return this.#result !== null && this.#result !== undefined;
  }

  /** Ruta donde se puede volver a ver la partida. */
  get detailPath() {
    return this.isFromTournament()
      ? `/player/matches/${this.#id}/scoring`
      : `/quick-matches/${this.#id}/scoring`;
  }
}

export default RecentMatch;
