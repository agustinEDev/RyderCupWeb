import MatchPlayStrokeAllocator from './MatchPlayStrokeAllocator';

/**
 * Domain Service: StablefordCalculator
 *
 * Puntos Stableford y totales de golpes de una partida rápida. Puro, sin IO.
 *
 * NO reparte golpes: recibe el reparto ya resuelto (`allocation`), que sale de
 * `MatchPlayStrokeAllocator` o viene del backend. Esta clase llegó a tener su
 * propia copia del reparto y las dos acabaron discrepando, así que ahora solo
 * cuenta puntos con los golpes que le dan.
 *
 * El par sí lo resuelve: cada jugador puntúa contra la tarjeta de SU barra
 * cuando se le pasan las salidas del campo. `holes` es solo la tarjeta de la
 * primera barra, y en 25 de los 800 campos federados el par cambia entre
 * barras. El backend ya puntúa así (`GolfCourse.hole_card_for`), así que
 * contarlo aquí contra el campo separaba la pantalla del historial. Se resuelve
 * en esta clase, y no en cada llamante, para que las tres superficies que
 * puntúan —tarjeta, clasificación y vuelta propia— no puedan volver a
 * separarse. Ver RyderCupWeb#417.
 *
 * Tabla de puntos por hoyo: max(0, 2 - (neto - par)).
 */
class StablefordCalculator {
  /**
   * Golpes que recibe un participante en un hoyo, según el reparto ya resuelto.
   *
   * El reparto lo hace `MatchPlayStrokeAllocator` (o lo manda el backend) y
   * llega aquí hecho. Antes esta clase lo recalculaba por su cuenta a partir
   * del hándicap, y esa segunda copia acabó discrepando de la de la tarjeta:
   * mismo jugador, misma pantalla, dos totales Stableford distintos.
   *
   * @param {Object<string, {strokesByHole: Object<number, number>}>} allocation
   * @param {string} participantId
   * @param {number} holeNumber
   * @returns {number} Con signo: negativo si cede golpes (hándicap plus)
   */
  static strokesOnHole(allocation, participantId, holeNumber) {
    return allocation?.[participantId]?.strokesByHole?.[holeNumber] ?? 0;
  }

  /**
   * Stableford points scored on a single hole.
   *
   * @param {number|null} grossScore
   * @param {number} par
   * @param {number} strokesReceived
   * @returns {number}
   */
  static holePoints(grossScore, par, strokesReceived) {
    if (grossScore == null) return 0;
    const netScore = grossScore - strokesReceived;
    return Math.max(0, 2 - (netScore - par));
  }

  /**
   * Aggregates Stableford points and gross strokes for one participant,
   * over the holes that already have a recorded score.
   *
   * @param {{participantId: string, handicap: number|null, color?: string|null, teeGender?: string|null}} participant
   * @param {Array<{holeNumber: number, par: number, strokeIndex: number}>} holes
   * @param {Array<{holeNumber: number, participantId: string, score: number}>} holeScores
   * @param {Object<string, {strokesByHole: Object<number, number>}>} allocation - Reparto ya
   *   resuelto, de `MatchPlayStrokeAllocator.resolve`. Sin entrada para el participante se
   *   puntúa a bruto, así que pasarle otra cosa (los tees, como pedía la firma vieja) no
   *   falla: cuenta mal en silencio.
   * @param {Array<Object>} [tees] - Salidas del campo. Con ellas se puntúa contra el par de
   *   la barra del participante; sin ellas, contra `holes`, que es la tarjeta de la primera.
   * @returns {{stablefordPoints: number, totalStrokes: number, netStrokes: number, parPlayed: number, holesPlayed: number}}
   */
  static computeParticipantTotals(participant, holes, holeScores, allocation = {}, tees = []) {
    let stablefordPoints = 0;
    let totalStrokes = 0;
    let netStrokes = 0;
    let parPlayed = 0;
    let holesPlayed = 0;

    // Todo o nada, igual que `GolfCourse.hole_card_for` en el backend: con que
    // la barra traiga tarjeta se usa entera. Completar hoyo a hoyo los huecos
    // de una tarjeta parcial daría aquí un total que el historial no da. Ver
    // RyderCupAm#215.
    const card = MatchPlayStrokeAllocator.holeCardFor(participant, holes, tees);

    for (const hole of card) {
      const entry = holeScores.find(
        (hs) => hs.participantId === participant.participantId && hs.holeNumber === hole.holeNumber
      );
      if (!entry || entry.score == null) continue;

      const strokesReceived = StablefordCalculator.strokesOnHole(
        allocation,
        participant.participantId,
        hole.holeNumber
      );
      stablefordPoints += StablefordCalculator.holePoints(entry.score, hole.par, strokesReceived);
      totalStrokes += entry.score;
      netStrokes += entry.score - strokesReceived;
      parPlayed += hole.par;
      holesPlayed += 1;
    }

    return { stablefordPoints, totalStrokes, netStrokes, parPlayed, holesPlayed };
  }

  /**
   * Formats a net-to-par score in standard golf notation: "PAR" when even,
   * otherwise a signed number (e.g. "-3", "+4").
   *
   * @param {number} toPar - netStrokes - parPlayed
   * @returns {string}
   */
  static formatToPar(toPar) {
    if (toPar === 0) return 'PAR';
    return toPar > 0 ? `+${toPar}` : `${toPar}`;
  }

  /**
   * Ranks participants by Stableford points (desc), tie-broken by fewer
   * total strokes.
   *
   * @param {Array<{participantId: string, name: string, handicap: number|null}>} participants
   * @param {Array<{holeNumber: number, par: number, strokeIndex: number}>} holes
   * @param {Array<{holeNumber: number, participantId: string, score: number}>} holeScores
   * @param {Object<string, {strokesByHole: Object<number, number>}>} allocation
   * @returns {Array<{participantId: string, name: string, stablefordPoints: number, totalStrokes: number, holesPlayed: number}>}
   */
  static rankParticipants(participants, holes, holeScores, allocation = {}, tees = []) {
    const rows = participants.map((participant) => ({
      participantId: participant.participantId,
      name: participant.name,
      team: participant.team,
      ...StablefordCalculator.computeParticipantTotals(
        participant,
        holes,
        holeScores,
        allocation,
        tees
      ),
    }));

    return rows.sort((a, b) => {
      if (b.stablefordPoints !== a.stablefordPoints) return b.stablefordPoints - a.stablefordPoints;
      return a.totalStrokes - b.totalStrokes;
    });
  }

  /**
   * Ranks participants by score-to-par (net strokes minus par played, asc,
   * fewer is better) for Medal play — not raw net strokes, so participants
   * with a partial round (fewer holes played) still rank fairly against
   * those further along. Participants with no recorded score sink to the
   * bottom.
   *
   * @param {Array<{participantId: string, name: string, handicap: number|null}>} participants
   * @param {Array<{holeNumber: number, par: number, strokeIndex: number}>} holes
   * @param {Array<{holeNumber: number, participantId: string, score: number}>} holeScores
   * @param {Object<string, {strokesByHole: Object<number, number>}>} allocation
   * @returns {Array<{participantId: string, name: string, stablefordPoints: number, totalStrokes: number, netStrokes: number, parPlayed: number, holesPlayed: number}>}
   */
  static rankParticipantsByMedal(participants, holes, holeScores, allocation = {}, tees = []) {
    const rows = participants.map((participant) => ({
      participantId: participant.participantId,
      name: participant.name,
      team: participant.team,
      ...StablefordCalculator.computeParticipantTotals(
        participant,
        holes,
        holeScores,
        allocation,
        tees
      ),
    }));

    return rows.sort((a, b) => {
      if (a.holesPlayed === 0 && b.holesPlayed === 0) return 0;
      if (a.holesPlayed === 0) return 1;
      if (b.holesPlayed === 0) return -1;
      // Score-to-par (net strokes minus par for the holes actually played),
      // not raw net strokes: fair when participants have played a different
      // number of holes (partial rounds), matching standard golf leaderboards.
      return (a.netStrokes - a.parPlayed) - (b.netStrokes - b.parPlayed);
    });
  }
}

export default StablefordCalculator;
