/**
 * Domain Service: StablefordCalculator
 *
 * Computes Stableford points and stroke totals for quick match participants.
 * Pure, no IO — mirrors the quick match philosophy (simple, informal scoring):
 * strokes are allocated from the participant's raw handicap index directly
 * against the course's stroke index (no tee/slope-adjusted playing handicap,
 * since quick match creation doesn't collect a tee selection).
 *
 * Points table (per hole): max(0, 2 - (netScore - par)).
 */
class StablefordCalculator {
  /**
   * Strokes a participant receives (or gives, if handicap is negative) on a hole.
   *
   * @param {number|null} handicap
   * @param {number} strokeIndex - 1 (hardest) to 18 (easiest)
   * @returns {number}
   */
  static allocateStrokes(handicap, strokeIndex) {
    if (handicap == null) return 0;

    const rounded = Math.round(handicap);
    if (rounded === 0) return 0;

    if (rounded > 0) {
      const base = Math.floor(rounded / 18);
      const extra = (rounded % 18) >= strokeIndex ? 1 : 0;
      return base + extra;
    }

    // Plus-handicap player: WHS Rule 8.2 deducts strokes starting from the
    // easiest hole (highest stroke index) and works backwards.
    const magnitude = Math.abs(rounded);
    const base = -Math.floor(magnitude / 18);
    const extra = (magnitude % 18) >= (19 - strokeIndex) ? -1 : 0;
    return base + extra;
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
   * @param {{participantId: string, handicap: number|null}} participant
   * @param {Array<{holeNumber: number, par: number, strokeIndex: number}>} holes
   * @param {Array<{holeNumber: number, participantId: string, score: number}>} holeScores
   * @returns {{stablefordPoints: number, totalStrokes: number, netStrokes: number, holesPlayed: number}}
   */
  static computeParticipantTotals(participant, holes, holeScores) {
    let stablefordPoints = 0;
    let totalStrokes = 0;
    let netStrokes = 0;
    let holesPlayed = 0;

    for (const hole of holes) {
      const entry = holeScores.find(
        (hs) => hs.participantId === participant.participantId && hs.holeNumber === hole.holeNumber
      );
      if (!entry || entry.score == null) continue;

      const strokesReceived = StablefordCalculator.allocateStrokes(participant.handicap, hole.strokeIndex);
      stablefordPoints += StablefordCalculator.holePoints(entry.score, hole.par, strokesReceived);
      totalStrokes += entry.score;
      netStrokes += entry.score - strokesReceived;
      holesPlayed += 1;
    }

    return { stablefordPoints, totalStrokes, netStrokes, holesPlayed };
  }

  /**
   * Ranks participants by Stableford points (desc), tie-broken by fewer
   * total strokes.
   *
   * @param {Array<{participantId: string, name: string, handicap: number|null}>} participants
   * @param {Array<{holeNumber: number, par: number, strokeIndex: number}>} holes
   * @param {Array<{holeNumber: number, participantId: string, score: number}>} holeScores
   * @returns {Array<{participantId: string, name: string, stablefordPoints: number, totalStrokes: number, holesPlayed: number}>}
   */
  static rankParticipants(participants, holes, holeScores) {
    const rows = participants.map((participant) => ({
      participantId: participant.participantId,
      name: participant.name,
      team: participant.team,
      ...StablefordCalculator.computeParticipantTotals(participant, holes, holeScores),
    }));

    return rows.sort((a, b) => {
      if (b.stablefordPoints !== a.stablefordPoints) return b.stablefordPoints - a.stablefordPoints;
      return a.totalStrokes - b.totalStrokes;
    });
  }

  /**
   * Ranks participants by net strokes (asc, fewer is better) for Medal play,
   * only counting participants who have at least one recorded score.
   *
   * @param {Array<{participantId: string, name: string, handicap: number|null}>} participants
   * @param {Array<{holeNumber: number, par: number, strokeIndex: number}>} holes
   * @param {Array<{holeNumber: number, participantId: string, score: number}>} holeScores
   * @returns {Array<{participantId: string, name: string, stablefordPoints: number, totalStrokes: number, netStrokes: number, holesPlayed: number}>}
   */
  static rankParticipantsByMedal(participants, holes, holeScores) {
    const rows = participants.map((participant) => ({
      participantId: participant.participantId,
      name: participant.name,
      team: participant.team,
      ...StablefordCalculator.computeParticipantTotals(participant, holes, holeScores),
    }));

    return rows.sort((a, b) => {
      if (a.holesPlayed === 0 && b.holesPlayed === 0) return 0;
      if (a.holesPlayed === 0) return 1;
      if (b.holesPlayed === 0) return -1;
      return a.netStrokes - b.netStrokes;
    });
  }
}

export default StablefordCalculator;
