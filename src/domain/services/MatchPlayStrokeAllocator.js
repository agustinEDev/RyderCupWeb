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

// Rangos que valida `TeeRating` en el backend. Son MÁS ESTRECHOS que los que
// admite el `Tee` del frontend (CR 45-90, SR 40-160), que se ensancharon para
// los pitch & putt federados. El backend descarta la barra que se sale y hace
// jugar con el Handicap Index a pelo, así que aquí hay que descartarla igual:
// si no, el reparto cambia en cuanto se cae la red, que es justo cuando este
// cálculo tiene que servir para algo.
// El arreglo de fondo es ensanchar `TeeRating`, pero lo comparte `competition`
// y tocarlo movería el reparto de las competiciones ya creadas.
const RATED_MIN_COURSE_RATING = 55;
const RATED_MAX_COURSE_RATING = 85;
const RATED_MIN_SLOPE_RATING = 55;
const RATED_MAX_SLOPE_RATING = 155;
const RATED_MIN_PAR = 66;
const RATED_MAX_PAR = 76;

class MatchPlayStrokeAllocator {
  /**
   * Golpes que reparte un Playing Handicap en un hoyo concreto, CON SIGNO.
   *
   * Positivo se reparte del hoyo más difícil (stroke index 1) al más fácil,
   * dando la vuelta al pasar de 18. Negativo (hándicap plus) se cede empezando
   * por el más fácil y hacia atrás, que es lo que manda la Regla WHS 8.2.
   *
   * @param {number} playingHandicap - Entero, puede ser negativo
   * @param {number} strokeIndex - 1 (más difícil) a 18
   * @param {number} totalHoles
   * @returns {number} Positivo si recibe, negativo si cede
   */
  static strokesOnHole(playingHandicap, strokeIndex, totalHoles = HOLES_PER_ROUND) {
    if (!playingHandicap || totalHoles === 0) return 0;

    const sign = playingHandicap > 0 ? 1 : -1;
    const magnitude = Math.abs(playingHandicap);
    const base = Math.floor(magnitude / totalHoles);
    const remainder = magnitude % totalHoles;
    const extra =
      sign > 0
        ? remainder >= strokeIndex
        : remainder >= totalHoles + 1 - strokeIndex;

    const count = base + (extra ? 1 : 0);
    // Sin este atajo, un reparto vacío de hándicap plus devuelve -0, que no es
    // igual a 0 para Object.is (y por tanto tampoco para toBe ni para toEqual)
    return count === 0 ? 0 : sign * count;
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
   * Si una barra se puede usar para calcular un hándicap de juego.
   *
   * Espeja la validación de `TeeRating` en el backend, par incluido. Una barra
   * fuera de rango no invalida la partida: se juega con el Handicap Index.
   *
   * @param {{courseRating: number, slopeRating: number}} tee
   * @param {number} par
   * @returns {boolean}
   */
  static isRatable(tee, par) {
    if (!tee) return false;
    return (
      Number.isFinite(tee.courseRating) &&
      Number.isFinite(tee.slopeRating) &&
      tee.courseRating >= RATED_MIN_COURSE_RATING &&
      tee.courseRating <= RATED_MAX_COURSE_RATING &&
      tee.slopeRating >= RATED_MIN_SLOPE_RATING &&
      tee.slopeRating <= RATED_MAX_SLOPE_RATING &&
      par >= RATED_MIN_PAR &&
      par <= RATED_MAX_PAR
    );
  }

  /**
   * La barra del participante, solo si se puede valorar.
   *
   * @returns {?{tee: Object, par: number}}
   */
  static ratableTeeFor(participant, holes, tees) {
    const tee = MatchPlayStrokeAllocator.findTee(participant, tees);
    if (!tee) return null;
    const par = MatchPlayStrokeAllocator.parFor(tee, holes);
    return MatchPlayStrokeAllocator.isRatable(tee, par) ? { tee, par } : null;
  }

  /**
   * Course Handicap (sin allowance), base de los repartos por equipos.
   *
   * @returns {number} Entero >= 0
   */
  static courseHandicap(participant, holes, tees) {
    const hi = participant?.handicap;
    if (hi == null) return 0;

    const rated = MatchPlayStrokeAllocator.ratableTeeFor(participant, holes, tees);
    if (!rated) return Math.max(0, PlayingHandicapCalculator.roundHalfAwayFromZero(hi));

    const { tee, par } = rated;
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
   * `allowNegative` deja pasar el hándicap plus, que cede golpes al campo
   * (Regla WHS 8.2). En match play no se usa: la diferencia entre los dos
   * Playing Handicaps ya recoge la ventaja, y el WHS acota cada uno a cero
   * antes de restarlos.
   *
   * @returns {number} Entero; negativo solo si allowNegative
   */
  static playingHandicap(participant, holes, tees, allowancePercentage, allowNegative = false) {
    const hi = participant?.handicap;
    if (hi == null) return 0;

    const clamp = (value) => (allowNegative ? value : Math.max(0, value));

    const rated = MatchPlayStrokeAllocator.ratableTeeFor(participant, holes, tees);
    if (!rated) return clamp(PlayingHandicapCalculator.roundHalfAwayFromZero(hi));

    const ph = PlayingHandicapCalculator.calculate(
      hi,
      {
        courseRating: rated.tee.courseRating,
        slopeRating: rated.tee.slopeRating,
        par: rated.par,
      },
      allowancePercentage
    );
    return clamp(ph ?? 0);
  }

  /**
   * Par contra el que se valora una barra.
   *
   * Cada barra puede traer su propia tarjeta, y en un campo federado el par de
   * la barra de señora suele diferir del de caballero. Usar siempre el par del
   * campo desviaba el Course Handicap respecto al que calcula el backend, que
   * sí mira el de la barra.
   *
   * @param {{holes?: Array<{par: number}>}} tee
   * @param {Array<{par: number}>} holes - Tarjeta de referencia del campo
   * @returns {number}
   */
  static parFor(tee, holes) {
    if (tee?.holes?.length) {
      return tee.holes.reduce((sum, h) => sum + h.par, 0);
    }
    return holes.reduce((sum, h) => sum + h.par, 0);
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

  /**
   * Reparto efectivo de la partida: el del servidor si lo hay, si no el local.
   *
   * Lo usan la tarjeta y la clasificación, y por eso vive aquí: si cada
   * pestaña decidiese por su cuenta cuándo fiarse del servidor, una diferencia
   * entre las dos implementaciones se vería en una sí y en la otra no.
   *
   * @param {Object} params
   * @param {Array<{participantId: string, playingHandicap: number, strokesByHole: Object}>} params.participantStrokes
   * @returns {Object<string, {playingHandicap: number, strokesByHole: Object<number, number>}>}
   */
  static resolve({ participantStrokes = [], ...localParams }) {
    if (participantStrokes.length > 0) {
      return Object.fromEntries(
        participantStrokes.map((ps) => [
          ps.participantId,
          { playingHandicap: ps.playingHandicap, strokesByHole: ps.strokesByHole ?? {} },
        ])
      );
    }
    return MatchPlayStrokeAllocator.allocate(localParams);
  }

  // ===========================================
  // Reparto por formato
  // ===========================================

  static #byIndividualHandicap(participants, holes, tees, allowance) {
    const result = {};
    for (const p of participants) {
      // Sin acotar a cero: un hándicap plus cede golpes al campo, y acotarlo
      // dejaba la tarjeta contando una cosa y la clasificación otra
      const ph = MatchPlayStrokeAllocator.playingHandicap(p, holes, tees, allowance, true);
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
      participant: p,
      ch: MatchPlayStrokeAllocator.courseHandicap(p, holes, tees),
    }));
    const lowest = Math.min(...courseHandicaps.map((e) => e.ch));

    const result = {};
    for (const { participantId, ch, participant } of courseHandicaps) {
      const allocated = PlayingHandicapCalculator.roundHalfAwayFromZero(
        (ch - lowest) * (allowance / 100)
      );
      // Se enseña su hándicap de juego, no la diferencia: "recibe 14 golpes"
      // junto a "Hcp de juego 14" era el mismo número dos veces, y ninguno de
      // los dos era su hándicap de juego real
      result[participantId] = MatchPlayStrokeAllocator.#build(
        Math.max(0, allocated),
        holes,
        MatchPlayStrokeAllocator.playingHandicap(participant, holes, tees, allowance)
      );
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
    // una sola bola a golpe alterno, así que el golpe es del equipo. El
    // hándicap de juego que se enseña sí es el de cada uno.
    const build = (p, allocated) =>
      MatchPlayStrokeAllocator.#build(
        allocated,
        holes,
        MatchPlayStrokeAllocator.playingHandicap(p, holes, tees, allowance)
      );
    for (const p of teamA) result[p.participantId] = build(p, phA);
    for (const p of teamB) result[p.participantId] = build(p, phB);
    return result;
  }

  // ===========================================
  // Helpers
  // ===========================================

  /**
   * @param {number} allocated - Golpes a repartir (la diferencia en match play)
   * @param {Array<Object>} holes
   * @param {number} [displayHandicap] - Hándicap de juego del jugador, para
   *   enseñar. En match play NO coincide con `allocated`: uno es lo que juega y
   *   el otro lo que recibe.
   */
  static #build(allocated, holes, displayHandicap = allocated) {
    // El reparto va por el ORDEN de dificultad, no por el número de stroke
    // index en bruto: el backend recorre los hoyos ya ordenados y usa la
    // posición. Con una tarjeta 1..18 limpia da igual, pero un campo importado
    // con un stroke index repetido o fuera de rango pondría los golpes en
    // hoyos distintos dentro y fuera de línea.
    const byDifficulty = [...holes].sort((a, b) => a.strokeIndex - b.strokeIndex);

    const strokesByHole = {};
    byDifficulty.forEach((hole, position) => {
      // 18 fijo, no `holes.length`: `GolfCourse` valida exactamente 18 hoyos
      // como invariante, y el backend reparte contra esa misma constante. Usar
      // la longitud de la lista haría que una tarjeta parcial repartiese de más.
      const count = MatchPlayStrokeAllocator.strokesOnHole(allocated, position + 1);
      // Solo los hoyos con golpe, igual que el backend: así los dos repartos se
      // pueden comparar tal cual, sin arrastrar 18 ceros
      if (count !== 0) strokesByHole[hole.holeNumber] = count;
    });
    return { playingHandicap: displayHandicap, strokesByHole };
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
