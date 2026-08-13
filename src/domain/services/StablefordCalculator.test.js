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

  describe('resolveStrokesBasis', () => {
    const holes = [
      { holeNumber: 1, par: 4 },
      { holeNumber: 2, par: 4 },
    ]; // course par 8, for a simple round number

    it('should return null when the participant has no handicap', () => {
      const participant = { handicap: null, color: 'YELLOW', teeGender: 'MALE' };
      expect(StablefordCalculator.resolveStrokesBasis(participant, holes, [], 100)).toBeNull();
    });

    it('should fall back to raw handicap when no tee was selected', () => {
      const participant = { handicap: 12, color: null, teeGender: null };
      expect(StablefordCalculator.resolveStrokesBasis(participant, holes, [], 100)).toBe(12);
    });

    it('should fall back to raw handicap when the selected tee is not found on the course', () => {
      const participant = { handicap: 12, color: 'YELLOW', teeGender: 'MALE' };
      const tees = [{ color: 'WHITE', gender: 'MALE', courseRating: 72, slopeRating: 130 }];
      expect(StablefordCalculator.resolveStrokesBasis(participant, holes, tees, 100)).toBe(12);
    });

    it('should compute the Playing Handicap when a matching tee is found', () => {
      const participant = { handicap: 12, color: 'YELLOW', teeGender: 'MALE' };
      const tees = [{ color: 'YELLOW', gender: 'MALE', courseRating: 8, slopeRating: 113 }];
      // CH = 12 * (113/113) + (8 - 8) = 12, allowance 100% -> 12
      expect(StablefordCalculator.resolveStrokesBasis(participant, holes, tees, 100)).toBe(12);
    });

    it('should apply the allowance percentage to the Playing Handicap', () => {
      const participant = { handicap: 20, color: 'YELLOW', teeGender: 'MALE' };
      const tees = [{ color: 'YELLOW', gender: 'MALE', courseRating: 8, slopeRating: 113 }];
      // CH = 20, 90% allowance -> 18
      expect(StablefordCalculator.resolveStrokesBasis(participant, holes, tees, 90)).toBe(18);
    });

    it('should match tees with a null gender (gender-neutral) only against a participant with no teeGender', () => {
      const participant = { handicap: 12, color: 'YELLOW', teeGender: null };
      const tees = [{ color: 'YELLOW', gender: null, courseRating: 8, slopeRating: 113 }];
      expect(StablefordCalculator.resolveStrokesBasis(participant, holes, tees, 100)).toBe(12);
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
      expect(result).toEqual({
        stablefordPoints: 2,
        totalStrokes: 4,
        netStrokes: 4,
        parPlayed: 4,
        holesPlayed: 1,
      });
    });

    it('should ignore scores belonging to other participants', () => {
      const participant = { participantId: 'p-1', handicap: 0 };
      const holeScores = [{ holeNumber: 1, participantId: 'p-2', score: 3 }];

      const result = StablefordCalculator.computeParticipantTotals(participant, holes, holeScores);
      expect(result).toEqual({
        stablefordPoints: 0,
        totalStrokes: 0,
        netStrokes: 0,
        parPlayed: 0,
        holesPlayed: 0,
      });
    });

    it('should subtract strokes received from gross to compute net strokes', () => {
      const participant = { participantId: 'p-1', handicap: 18 };
      const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 5 }];

      const result = StablefordCalculator.computeParticipantTotals(participant, holes, holeScores);
      expect(result.netStrokes).toBe(4);
    });

    it('should use the Playing Handicap instead of the raw handicap when a tee is selected', () => {
      // Two holes par 4+3=7. Raw handicap 18 would give a stroke on every hole;
      // a tee/allowance combo that computes a lower Playing Handicap (e.g. 0)
      // must NOT grant that stroke.
      const participant = {
        participantId: 'p-1',
        handicap: 18,
        color: 'YELLOW',
        teeGender: 'MALE',
      };
      const tees = [{ color: 'YELLOW', gender: 'MALE', courseRating: 7, slopeRating: 113 }];
      const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];

      const result = StablefordCalculator.computeParticipantTotals(participant, holes, holeScores, tees, 100);
      // CH = 18*(113/113) + (7-7) = 18 -> 1 stroke on hole 1 (SI 5) -> net 3
      const resultLowAllowance = StablefordCalculator.computeParticipantTotals(
        participant,
        holes,
        holeScores,
        tees,
        20
      );
      // PH = round(18 * 0.20) = 4 -> below SI 5 -> no stroke on hole 1 -> net 4
      expect(result.netStrokes).toBe(3);
      expect(resultLowAllowance.netStrokes).toBe(4);
    });

    it('should only sum par for the holes actually played', () => {
      const participant = { participantId: 'p-1', handicap: 0 };
      const holeScores = [
        { holeNumber: 1, participantId: 'p-1', score: 4 },
        { holeNumber: 2, participantId: 'p-1', score: 3 },
      ];

      const result = StablefordCalculator.computeParticipantTotals(participant, holes, holeScores);
      expect(result.parPlayed).toBe(7); // par 4 + par 3
    });
  });

  describe('formatToPar', () => {
    it('formats an even score as PAR', () => {
      expect(StablefordCalculator.formatToPar(0)).toBe('PAR');
    });

    it('formats an under-par score with a leading minus sign', () => {
      expect(StablefordCalculator.formatToPar(-3)).toBe('-3');
    });

    it('formats an over-par score with a leading plus sign', () => {
      expect(StablefordCalculator.formatToPar(4)).toBe('+4');
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

    it('should rank by score-to-par, not raw net strokes, so a partial round ranks fairly', () => {
      // 3 holes, all par 4 (par total 12).
      const multiHoles = [
        { holeNumber: 1, par: 4, strokeIndex: 1 },
        { holeNumber: 2, par: 4, strokeIndex: 2 },
        { holeNumber: 3, par: 4, strokeIndex: 3 },
      ];
      const participants = [
        { participantId: 'further-along', name: 'Alice', handicap: 0 },
        { participantId: 'just-started', name: 'Bob', handicap: 0 },
      ];
      const holeScores = [
        // Alice played all 3 holes at par -> net 12, toPar 0.
        { holeNumber: 1, participantId: 'further-along', score: 4 },
        { holeNumber: 2, participantId: 'further-along', score: 4 },
        { holeNumber: 3, participantId: 'further-along', score: 4 },
        // Bob played only 1 hole with a bogey -> net 5, toPar +1.
        { holeNumber: 1, participantId: 'just-started', score: 5 },
      ];

      const ranking = StablefordCalculator.rankParticipantsByMedal(
        participants,
        multiHoles,
        holeScores
      );

      // Raw net strokes would rank Bob first (5 < 12); score-to-par correctly
      // ranks Alice first instead (even vs. one over).
      expect(ranking.map((r) => r.participantId)).toEqual(['further-along', 'just-started']);
    });
  });
});
