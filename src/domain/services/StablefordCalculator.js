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
   * @returns {{stablefordPoints: number, totalStrokes: number, netStrokes: number, parPlayed: number, holesPlayed: number}}
   */
  static computeParticipantTotals(participant, holes, holeScores, allocation = {}) {
    let stablefordPoints = 0;
    let totalStrokes = 0;
    let netStrokes = 0;
    let parPlayed = 0;
    let holesPlayed = 0;

    for (const hole of holes) {
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
  static rankParticipants(participants, holes, holeScores, allocation = {}) {
    const rows = participants.map((participant) => ({
      participantId: participant.participantId,
      name: participant.name,
      team: participant.team,
      ...StablefordCalculator.computeParticipantTotals(
        participant,
        holes,
        holeScores,
        allocation
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
  static rankParticipantsByMedal(participants, holes, holeScores, allocation = {}) {
    const rows = participants.map((participant) => ({
      participantId: participant.participantId,
      name: participant.name,
      team: participant.team,
      ...StablefordCalculator.computeParticipantTotals(
        participant,
        holes,
        holeScores,
        allocation
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
