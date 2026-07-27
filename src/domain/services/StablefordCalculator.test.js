import { describe, it, expect } from 'vitest';
import StablefordCalculator from './StablefordCalculator';

describe('StablefordCalculator', () => {
  describe('allocateStrokes', () => {
    it('should return 0 for null or zero handicap', () => {
      expect(StablefordCalculator.allocateStrokes(null, 5)).toBe(0);
      expect(StablefordCalculator.allocateStrokes(0, 5)).toBe(0);
    });

    it('should give exactly one stroke per hole for handicap 18 (every stroke index)', () => {
      for (let si = 1; si <= 18; si += 1) {
        expect(StablefordCalculator.allocateStrokes(18, si)).toBe(1);
      }
    });

    it('should give a stroke only on the hardest holes for handicap under 18', () => {
      expect(StablefordCalculator.allocateStrokes(9, 9)).toBe(1);
      expect(StablefordCalculator.allocateStrokes(9, 10)).toBe(0);
    });

    it('should give a second stroke on the hardest holes for handicap over 18', () => {
      // handicap 20: base 1 stroke everywhere + 1 extra on SI 1-2
      expect(StablefordCalculator.allocateStrokes(20, 1)).toBe(2);
      expect(StablefordCalculator.allocateStrokes(20, 3)).toBe(1);
    });

    it('should give strokes back on the easiest holes for a plus (negative) handicap', () => {
      // handicap -2: WHS Rule 8.2 deducts starting from the easiest hole (SI 18) backwards
      expect(StablefordCalculator.allocateStrokes(-2, 18)).toBe(-1);
      expect(StablefordCalculator.allocateStrokes(-2, 17)).toBe(-1);
      expect(StablefordCalculator.allocateStrokes(-2, 16)).toBe(0);
    });
  });

  describe('holePoints', () => {
    it('should return 0 when there is no gross score', () => {
      expect(StablefordCalculator.holePoints(null, 4, 0)).toBe(0);
    });

    it('should award 2 points for a net par', () => {
      expect(StablefordCalculator.holePoints(4, 4, 0)).toBe(2);
    });

    it('should award 3 points for a net birdie and 4 for a net eagle', () => {
      expect(StablefordCalculator.holePoints(3, 4, 0)).toBe(3);
      expect(StablefordCalculator.holePoints(2, 4, 0)).toBe(4);
    });

    it('should award 1 point for a net bogey and 0 for net double bogey or worse', () => {
      expect(StablefordCalculator.holePoints(5, 4, 0)).toBe(1);
      expect(StablefordCalculator.holePoints(6, 4, 0)).toBe(0);
      expect(StablefordCalculator.holePoints(9, 4, 0)).toBe(0);
    });

    it('should factor in strokes received when computing net score', () => {
      // Gross 5 on a par 4, with 1 stroke received -> net par -> 2 points
      expect(StablefordCalculator.holePoints(5, 4, 1)).toBe(2);
    });
  });

  describe('computeParticipantTotals', () => {
    const holes = [
      { holeNumber: 1, par: 4, strokeIndex: 5 },
      { holeNumber: 2, par: 3, strokeIndex: 15 },
    ];

    it('should only count holes with a recorded score', () => {
      const participant = { participantId: 'p-1', handicap: 0 };
      const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

      const result = StablefordCalculator.computeParticipantTotals(participant, holes, holeScores);
      expect(result).toEqual({ stablefordPoints: 2, totalStrokes: 4, netStrokes: 4, holesPlayed: 1 });
    });

    it('should ignore scores belonging to other participants', () => {
      const participant = { participantId: 'p-1', handicap: 0 };
      const holeScores = [{ holeNumber: 1, participantId: 'p-2', score: 3 }];

      const result = StablefordCalculator.computeParticipantTotals(participant, holes, holeScores);
      expect(result).toEqual({ stablefordPoints: 0, totalStrokes: 0, netStrokes: 0, holesPlayed: 0 });
    });

    it('should subtract strokes received from gross to compute net strokes', () => {
      const participant = { participantId: 'p-1', handicap: 18 };
      const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 5 }];

      const result = StablefordCalculator.computeParticipantTotals(participant, holes, holeScores);
      expect(result.netStrokes).toBe(4);
    });
  });

  describe('rankParticipants', () => {
    const holes = [{ holeNumber: 1, par: 4, strokeIndex: 5 }];

    it('should rank by Stableford points descending', () => {
      const participants = [
        { participantId: 'p-1', name: 'Alice', handicap: 0 },
        { participantId: 'p-2', name: 'Bob', handicap: 0 },
      ];
      const holeScores = [
        { holeNumber: 1, participantId: 'p-1', score: 5 }, // net bogey -> 1 pt
        { holeNumber: 1, participantId: 'p-2', score: 3 }, // net birdie -> 3 pts
      ];

      const ranking = StablefordCalculator.rankParticipants(participants, holes, holeScores);
      expect(ranking.map((r) => r.participantId)).toEqual(['p-2', 'p-1']);
    });

    it('should tie-break by fewer total strokes when points are equal', () => {
      const participants = [
        { participantId: 'p-1', name: 'Alice', handicap: 0 },
        { participantId: 'p-2', name: 'Bob', handicap: 10 },
      ];
      const holeScores = [
        { holeNumber: 1, participantId: 'p-1', score: 4 }, // net par (no strokes) -> 2 pts, 4 strokes
        { holeNumber: 1, participantId: 'p-2', score: 5 }, // handicap 10 gives no stroke on SI 5 -> net bogey -> 1pt... adjust below
      ];

      // Recompute with a handicap that actually grants a stroke on SI 5 to force a tie at 2 points
      const holeScoresTie = [
        { holeNumber: 1, participantId: 'p-1', score: 4 },
        { holeNumber: 1, participantId: 'p-2', score: 5 },
      ];
      const participantsTie = [
        { participantId: 'p-1', name: 'Alice', handicap: 0 },
        { participantId: 'p-2', name: 'Bob', handicap: 18 }, // stroke on every hole -> net 4 -> 2 pts
      ];

      const ranking = StablefordCalculator.rankParticipants(participantsTie, holes, holeScoresTie);
      expect(ranking[0].stablefordPoints).toBe(ranking[1].stablefordPoints);
      // Alice has fewer gross strokes (4 vs 5) so she ranks first on the tie-break
      expect(ranking[0].participantId).toBe('p-1');

      // Sanity check the original (non-tied) scenario still resolves without throwing
      expect(() => StablefordCalculator.rankParticipants(participants, holes, holeScores)).not.toThrow();
    });
  });

  describe('rankParticipantsByMedal', () => {
    const holes = [{ holeNumber: 1, par: 4, strokeIndex: 5 }];

    it('should rank by net strokes ascending', () => {
      const participants = [
        { participantId: 'p-1', name: 'Alice', handicap: 0 },
        { participantId: 'p-2', name: 'Bob', handicap: 18 },
      ];
      const holeScores = [
        { holeNumber: 1, participantId: 'p-1', score: 4 }, // net 4
        { holeNumber: 1, participantId: 'p-2', score: 4 }, // 1 stroke received -> net 3
      ];

      const ranking = StablefordCalculator.rankParticipantsByMedal(participants, holes, holeScores);
      expect(ranking.map((r) => r.participantId)).toEqual(['p-2', 'p-1']);
    });

    it('should push participants with no recorded scores to the bottom', () => {
      const participants = [
        { participantId: 'p-1', name: 'Alice', handicap: 0 },
        { participantId: 'p-2', name: 'Bob', handicap: 0 },
      ];
      const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

      const ranking = StablefordCalculator.rankParticipantsByMedal(participants, holes, holeScores);
      expect(ranking.map((r) => r.participantId)).toEqual(['p-1', 'p-2']);
    });
  });
});
