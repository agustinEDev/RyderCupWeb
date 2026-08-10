/**
 * Entity: PlayerStats
 *
 * El rendimiento de un jugador, agregado por el backend a partir de sus
 * vueltas de partida rápida y de torneo (RyderCupAm BE #128 y BE #167).
 *
 * Casi todo puede venir en null, y esa es la parte importante: una cuenta
 * recién creada no tiene medias, y un jugador que nunca registró el tee de sus
 * partidas no tiene índice. Null no es cero — significa "todavía no hay con qué
 * calcularlo" — y la interfaz tiene que distinguirlo o enseñará un 0.0 que
 * parece un dato.
 *
 * Inmutable: no hay operaciones que cambien un resumen ya calculado.
 */
class PlayerStats {
  #handicap;
  #handicapTrend;
  #scoringAvg;
  #roundsPlayed;
  #tournamentsTotal;
  #tournamentsActive;
  #estimatedIndex;
  #playingAvg;
  #bestDifferential;
  #roundsWithDifferential;
  #differentials;

  constructor({
    handicap = null,
    handicapTrend = null,
    scoringAvg = null,
    roundsPlayed = 0,
    tournamentsTotal = 0,
    tournamentsActive = 0,
    estimatedIndex = null,
    playingAvg = null,
    bestDifferential = null,
    roundsWithDifferential = 0,
    differentials = [],
  } = {}) {
    this.#handicap = handicap;
    this.#handicapTrend = handicapTrend;
    this.#scoringAvg = scoringAvg;
    this.#roundsPlayed = roundsPlayed;
    this.#tournamentsTotal = tournamentsTotal;
    this.#tournamentsActive = tournamentsActive;
    this.#estimatedIndex = estimatedIndex;
    this.#playingAvg = playingAvg;
    this.#bestDifferential = bestDifferential;
    this.#roundsWithDifferential = roundsWithDifferential;
    this.#differentials = Object.freeze([...differentials]);
  }

  // === Factory Methods ===

  static fromPersistence(props) {
    return new PlayerStats(props);
  }

  /** El resumen de quien todavía no ha jugado nada. */
  static empty() {
    return new PlayerStats();
  }

  // === Getters ===

  get handicap() {
    return this.#handicap;
  }

  get handicapTrend() {
    return this.#handicapTrend;
  }

  get scoringAvg() {
    return this.#scoringAvg;
  }

  get roundsPlayed() {
    return this.#roundsPlayed;
  }

  get tournamentsTotal() {
    return this.#tournamentsTotal;
  }

  get tournamentsActive() {
    return this.#tournamentsActive;
  }

  get estimatedIndex() {
    return this.#estimatedIndex;
  }

  get playingAvg() {
    return this.#playingAvg;
  }

  get bestDifferential() {
    return this.#bestDifferential;
  }

  get roundsWithDifferential() {
    return this.#roundsWithDifferential;
  }

  get differentials() {
    return this.#differentials;
  }

  // === Business Rules ===

  /**
   * Si hay un índice que enseñar.
   *
   * El backend lo deja en null por debajo de tres vueltas: el WHS pide 54
   * hoyos antes de dar un número.
   */
  hasEstimatedIndex() {
    return this.#estimatedIndex !== null && this.#estimatedIndex !== undefined;
  }

  /**
   * Si el índice se calculó sobre menos vueltas de las que el jugador ha
   * jugado, porque a alguna le faltaba el tee.
   *
   * Merece decirlo: si no, el número parece mirar todas sus vueltas.
   */
  hasRoundsWithoutDifferential() {
    return this.#roundsWithDifferential < this.#roundsPlayed;
  }

  /**
   * Si está jugando mejor que su hándicap oficial.
   *
   * Es la comparación que da sentido a la pareja de cifras: "tu hándicap es
   * 14,2 y estás jugando a 12,8" solo se puede decir cuando existen las dos.
   */
  isPlayingBetterThanHandicap() {
    if (this.#handicap === null || !this.hasEstimatedIndex()) {
      return false;
    }
    return this.#estimatedIndex < this.#handicap;
  }

  /**
   * Si la tendencia es de mejora.
   *
   * El backend devuelve la resta cruda de diferenciales, que **bajan** al jugar
   * mejor, igual que baja un hándicap. De ahí que mejorar sea negativo: no es
   * un error de signo, es la convención del golf.
   */
  isImproving() {
    return this.#handicapTrend !== null && this.#handicapTrend < 0;
  }
}

export default PlayerStats;
