import PlayingHandicapCalculator from './PlayingHandicapCalculator';

/**
 * Domain Service: MatchPlayStrokeAllocator
 *
 * Espejo del `StrokeAllocationService` del backend
 * (quick_match/domain/services/stroke_allocation_service.py). Responde a una
 * sola pregunta: cuántos golpes recibe cada participante en cada hoyo.
 *
 * La duplicación con el backend es deliberada y permanente: sin ella no hay
 * anotación sin conexión. Mientras las dos implementaciones coexistan, el
 * riesgo real es que se separen, así que los tests fijan la paridad con los
 * mismos números que produce Python.
 *
 * El reparto depende del formato, siguiendo el WHS:
 *
 * - SCRATCH: nadie recibe golpes, sea cual sea el formato.
 * - SINGLES: método diferencial. Solo el de mayor Playing Handicap recibe, y
 *   recibe la diferencia, en los hoyos de menor stroke index. Repartir el PH
 *   completo a cada uno da un total parecido pero en hoyos distintos, que es
 *   justo donde se deciden los hoyos ajustados.
 * - FOURBALL: diferencias respecto al menor Course Handicap de los cuatro.
 * - FOURSOMES: por equipo, sobre promedios de Course Handicap; los dos
 *   jugadores comparten reparto porque comparten bola.
 * - Partido libre (MEDAL/STABLEFORD): cada uno contra el campo, con su PH
 *   individual. Aquí el reparto individual sí es el correcto.
 */

const NEUTRAL_SLOPE = 113;
const HOLES_PER_ROUND = 18;
const SINGLES_PARTICIPANTS = 2;

class MatchPlayStrokeAllocator {
  /**
   * Golpes que reparte un Playing Handicap en un hoyo concreto.
   *
   * @param {number} playingHandicap - Entero >= 0
   * @param {number} strokeIndex - 1 (más difícil) a 18
   * @returns {number}
   */
  static strokesOnHole(playingHandicap, strokeIndex) {
    if (!playingHandicap || playingHandicap <= 0) return 0;
    const base = Math.floor(playingHandicap / HOLES_PER_ROUND);
    const extra = playingHandicap % HOLES_PER_ROUND >= strokeIndex ? 1 : 0;
    return base + extra;
  }

  /**
   * Busca la valoración del tee elegido por (color, género).
   *
   * El género forma parte de la clave, no es un detalle: un campo federado
   * valora la misma barra por separado para cada género, y la diferencia de
   * CR/SR entre ambas vale varios golpes.
   *
   * @param {{color: ?string, teeGender: ?string}} participant
   * @param {Array<Object>} tees
   * @returns {?Object}
   */
  static findTee(participant, tees = []) {
    if (!participant?.color) return null;
    return (
      tees.find(
        (t) =>
          t.color === participant.color &&
          (t.gender ?? null) === (participant.teeGender ?? null)
      ) ?? null
    );
  }

  /**
   * Course Handicap (sin allowance), base de los repartos por equipos.
   *
   * @returns {number} Entero >= 0
   */
  static courseHandicap(participant, holes, tees) {
    const hi = participant?.handicap;
    if (hi == null) return 0;

    const tee = MatchPlayStrokeAllocator.findTee(participant, tees);
    if (!tee) return Math.max(0, PlayingHandicapCalculator.roundHalfAwayFromZero(hi));

    const par = holes.reduce((sum, h) => sum + h.par, 0);
    const raw = hi * (tee.slopeRating / NEUTRAL_SLOPE) + (tee.courseRating - par);
    return Math.max(0, PlayingHandicapCalculator.roundHalfAwayFromZero(raw));
  }

  /**
   * Playing Handicap (con allowance aplicado).
   *
   * Sin hándicap conocido juega a scratch. Sin una barra que se pueda valorar
   * se usa el propio Handicap Index: es una aproximación, pero deja la partida
   * utilizable en vez de tratar al jugador como scratch.
   *
   * @returns {number} Entero >= 0
   */
  static playingHandicap(participant, holes, tees, allowancePercentage) {
    const hi = participant?.handicap;
    if (hi == null) return 0;

    const tee = MatchPlayStrokeAllocator.findTee(participant, tees);
    if (!tee) return Math.max(0, PlayingHandicapCalculator.roundHalfAwayFromZero(hi));

    const par = holes.reduce((sum, h) => sum + h.par, 0);
    const ph = PlayingHandicapCalculator.calculate(
      hi,
      { courseRating: tee.courseRating, slopeRating: tee.slopeRating, par },
      allowancePercentage
    );
    return Math.max(0, ph ?? 0);
  }

  /**
   * Reparto completo de la partida.
   *
   * @param {Object} params
   * @param {Array<Object>} params.participants
   * @param {Array<{holeNumber: number, par: number, strokeIndex: number}>} params.holes
   * @param {Array<Object>} params.tees
   * @param {?string} params.matchFormat - SINGLES/FOURBALL/FOURSOMES, o null en partido libre
   * @param {number} params.allowancePercentage
   * @param {string} params.playMode - 'SCRATCH' | 'HANDICAP'
   * @returns {Object<string, {playingHandicap: number, strokesByHole: Object<number, number>}>}
   */
  static allocate({
    participants = [],
    holes = [],
    tees = [],
    matchFormat = null,
    allowancePercentage = 100,
    playMode = 'HANDICAP',
  }) {
    if (playMode === 'SCRATCH') {
      return MatchPlayStrokeAllocator.#zeroed(participants);
    }

    if (matchFormat === null) {
      return MatchPlayStrokeAllocator.#byIndividualHandicap(
        participants,
        holes,
        tees,
        allowancePercentage
      );
    }

    if (matchFormat === 'SINGLES') {
      return MatchPlayStrokeAllocator.#singles(participants, holes, tees, allowancePercentage);
    }

    if (matchFormat === 'FOURBALL') {
      return MatchPlayStrokeAllocator.#fourball(participants, holes, tees, allowancePercentage);
    }

    return MatchPlayStrokeAllocator.#foursomes(participants, holes, tees, allowancePercentage);
  }

  // ===========================================
  // Reparto por formato
  // ===========================================

  static #byIndividualHandicap(participants, holes, tees, allowance) {
    const result = {};
    for (const p of participants) {
      const ph = MatchPlayStrokeAllocator.playingHandicap(p, holes, tees, allowance);
      result[p.participantId] = MatchPlayStrokeAllocator.#build(ph, holes);
    }
    return result;
  }

  static #singles(participants, holes, tees, allowance) {
    if (participants.length !== SINGLES_PARTICIPANTS) {
      return MatchPlayStrokeAllocator.#zeroed(participants);
    }

    const [a, b] = participants;
    const phA = MatchPlayStrokeAllocator.playingHandicap(a, holes, tees, allowance);
    const phB = MatchPlayStrokeAllocator.playingHandicap(b, holes, tees, allowance);
    const diff = phA - phB;

    return {
      [a.participantId]: {
        ...MatchPlayStrokeAllocator.#build(Math.max(0, diff), holes),
        playingHandicap: phA,
      },
      [b.participantId]: {
        ...MatchPlayStrokeAllocator.#build(Math.max(0, -diff), holes),
        playingHandicap: phB,
      },
    };
  }

  static #fourball(participants, holes, tees, allowance) {
    const courseHandicaps = participants.map((p) => ({
      participantId: p.participantId,
      ch: MatchPlayStrokeAllocator.courseHandicap(p, holes, tees),
    }));
    const lowest = Math.min(...courseHandicaps.map((e) => e.ch));

    const result = {};
    for (const { participantId, ch } of courseHandicaps) {
      const ph = PlayingHandicapCalculator.roundHalfAwayFromZero(
        (ch - lowest) * (allowance / 100)
      );
      result[participantId] = MatchPlayStrokeAllocator.#build(Math.max(0, ph), holes);
    }
    return result;
  }

  static #foursomes(participants, holes, tees, allowance) {
    const teamA = participants.filter((p) => p.team === 'A');
    const teamB = participants.filter((p) => p.team === 'B');
    if (teamA.length === 0 || teamB.length === 0) {
      return MatchPlayStrokeAllocator.#zeroed(participants);
    }

    const average = (team) =>
      team.reduce((sum, p) => sum + MatchPlayStrokeAllocator.courseHandicap(p, holes, tees), 0) /
      team.length;

    const avgA = average(teamA);
    const avgB = average(teamB);
    const strokes = PlayingHandicapCalculator.roundHalfAwayFromZero(
      Math.abs(avgA - avgB) * (allowance / 100)
    );

    const phA = avgA > avgB ? strokes : 0;
    const phB = avgB > avgA ? strokes : 0;

    const result = {};
    // Los dos jugadores del equipo reciben exactamente el mismo reparto: juegan
    // una sola bola a golpe alterno, así que el golpe es del equipo
    for (const p of teamA) result[p.participantId] = MatchPlayStrokeAllocator.#build(phA, holes);
    for (const p of teamB) result[p.participantId] = MatchPlayStrokeAllocator.#build(phB, holes);
    return result;
  }

  // ===========================================
  // Helpers
  // ===========================================

  static #build(playingHandicap, holes) {
    const strokesByHole = {};
    for (const hole of holes) {
      strokesByHole[hole.holeNumber] = MatchPlayStrokeAllocator.strokesOnHole(
        playingHandicap,
        hole.strokeIndex
      );
    }
    return { playingHandicap, strokesByHole };
  }

  static #zeroed(participants) {
    const result = {};
    for (const p of participants) {
      result[p.participantId] = { playingHandicap: 0, strokesByHole: {} };
    }
    return result;
  }
}

export default MatchPlayStrokeAllocator;
