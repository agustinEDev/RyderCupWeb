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
// Un día sin hora («2026-10-21») es ese día a medianoche LOCAL: `new Date()` lo
// leía como medianoche UTC, y al oeste de Greenwich salía el día antes (H5)
const DIA = /^(\d{4})-(\d{2})-(\d{2})$/;
const diaLocal = (valor) => {
  const partes = typeof valor === 'string' ? DIA.exec(valor) : null;
  return partes ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) : new Date(valor);
};

class RecentMatch {
  #id;
  #date;
  // La partida rápida, su instante (H5): el día se pinta en la hora local
  #playedAt;
  #matchFormat;
  #scoringFormat;
  #golfCourseId;
  #golfCourseName;
  #matchName;
  #tournamentName;
  #result;
  #score;
  #stablefordPoints;
  #totalStrokes;
  #holesPlayed;
  #partners;
  #opponents;
  #excludedFromStats;

  constructor({
    id,
    date = null,
    playedAt = null,
    matchFormat = null,
    scoringFormat = null,
    golfCourseId = null,
    golfCourseName = null,
    matchName = null,
    tournamentName = null,
    result = null,
    score = null,
    stablefordPoints = null,
    totalStrokes = null,
    holesPlayed = null,
    partners = [],
    opponents = [],
    excludedFromStats = false,
  }) {
    if (!id || typeof id !== 'string') {
      throw new TypeError('id must be a non-empty string');
    }

    this.#id = id;
    this.#date = date ? diaLocal(date) : null;
    this.#playedAt = playedAt ? new Date(playedAt) : null;
    this.#matchFormat = matchFormat;
    this.#scoringFormat = scoringFormat;
    this.#golfCourseId = golfCourseId;
    this.#golfCourseName = golfCourseName;
    // El nombre que le puso quien creó la partida rápida. Un partido de torneo
    // no tiene nombre propio: tiene el de su competición, en `tournamentName`
    this.#matchName = matchName;
    this.#tournamentName = tournamentName;
    this.#result = result;
    this.#score = score;
    this.#stablefordPoints = stablefordPoints;
    this.#totalStrokes = totalStrokes;
    this.#holesPlayed = holesPlayed;
    this.#partners = Object.freeze([...partners]);
    this.#opponents = Object.freeze([...opponents]);
    this.#excludedFromStats = excludedFromStats;
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

  get playedAt() {
    return this.#playedAt;
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

  get matchName() {
    return this.#matchName;
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

  get totalStrokes() {
    return this.#totalStrokes;
  }

  get holesPlayed() {
    return this.#holesPlayed;
  }

  /**
   * Si la vuelta fue de nueve hoyos.
   *
   * Importa enseñarlo: «45 golpes» al lado de «90 golpes» parece un juegazo en
   * vez de media vuelta.
   */
  isHalfRound() {
    return this.#holesPlayed === 9;
  }

  get partners() {
    return this.#partners;
  }

  get opponents() {
    return this.#opponents;
  }

  /**
   * True si el jugador ha dejado esta partida fuera de sus estadísticas.
   *
   * El historial la sigue enseñando, marcada, pero el resumen de arriba no la
   * cuenta: sin la marca, las dos cifras se contradicen sin explicación.
   */
  get excludedFromStats() {
    return this.#excludedFromStats;
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
   * juega contra un rival concreto. Una partida rápida sin terminar también
   * cuenta aquí: lleva su insignia, «ST».
   */
  hasResult() {
    return this.#result !== null && this.#result !== undefined;
  }

  /**
   * Una partida rápida de match play que no cuenta: ni decidida antes de
   * tiempo ni con los mismos hoyos, 9 o más, en los dos bandos (24 oct 2026).
   */
  isUnfinished() {
    return this.#result === 'UNFINISHED';
  }

  /** El marcador que se enseña: sin terminar no hay, aunque llegara uno. */
  get shownScore() {
    return this.isUnfinished() ? null : this.#score;
  }

  /** Ruta donde se puede volver a ver la partida. */
  get detailPath() {
    return this.isFromTournament()
      ? `/player/matches/${this.#id}/scoring`
      : `/quick-matches/${this.#id}/scoring`;
  }
}

export default RecentMatch;
