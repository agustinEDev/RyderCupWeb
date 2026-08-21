import { describe, it, expect } from 'vitest';
import StablefordCalculator from './StablefordCalculator';

describe('StablefordCalculator', () => {
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
      const allocation = { 'p-1': { playingHandicap: 18, strokesByHole: { 1: 1 } } };

      const result = StablefordCalculator.computeParticipantTotals(
        participant,
        holes,
        holeScores,
        allocation
      );
      expect(result.netStrokes).toBe(4);
    });

    it('should add back the strokes a plus handicap gives to the course', () => {
      const participant = { participantId: 'p-1', handicap: -2 };
      const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 4 }];
      const allocation = { 'p-1': { playingHandicap: -2, strokesByHole: { 1: -1 } } };

      const result = StablefordCalculator.computeParticipantTotals(
        participant,
        holes,
        holeScores,
        allocation
      );
      // Cede un golpe: su neto empeora, no mejora
      expect(result.netStrokes).toBe(5);
      expect(result.stablefordPoints).toBe(1);
    });

    it('should count nothing for a participant missing from the allocation', () => {
      const participant = { participantId: 'p-1', handicap: 18 };
      const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: 5 }];

      // Sin reparto no hay golpes: el neto es el bruto
      const result = StablefordCalculator.computeParticipantTotals(participant, holes, holeScores, {});
      expect(result.netStrokes).toBe(5);
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
      const allocation = { 'p-2': { playingHandicap: 18, strokesByHole: { 1: 1 } } };

      const ranking = StablefordCalculator.rankParticipants(
        participantsTie,
        holes,
        holeScoresTie,
        allocation
      );
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
      const allocation = { 'p-2': { playingHandicap: 18, strokesByHole: { 1: 1 } } };

      const ranking = StablefordCalculator.rankParticipantsByMedal(
        participants,
        holes,
        holeScores,
        allocation
      );
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

  describe('picked-up holes (raya)', () => {
    // El campo de paridad con el backend: los mismos pares, indices y golpes
    // que `test_stableford_calculator.py`, para que los dos motores tengan que
    // inventar el mismo numero cuando no hay ninguno anotado.
    const PARS = [4, 5, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
    const STROKE_INDEXES = [7, 3, 15, 1, 11, 17, 5, 9, 13, 8, 16, 2, 10, 6, 18, 12, 4, 14];
    const SCORES = [5, 6, 4, 6, 5, 3, 6, 5, 4, 5, 4, 7, 5, 4, 3, 5, 6, 5];

    const parityHoles = () =>
      PARS.map((par, i) => ({ holeNumber: i + 1, par, strokeIndex: STROKE_INDEXES[i] }));

    const parityScores = (pickedUpHole = null) =>
      SCORES.map((score, i) => ({
        holeNumber: i + 1,
        participantId: 'p-1',
        score: i + 1 === pickedUpHole ? null : score,
      }));

    const holes = [
      { holeNumber: 1, par: 4, strokeIndex: 5 },
      { holeNumber: 2, par: 3, strokeIndex: 15 },
    ];

    it('should count a picked-up hole as played', () => {
      const participant = { participantId: 'p-1', handicap: 0 };
      const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: null }];

      const result = StablefordCalculator.computeParticipantTotals(participant, holes, holeScores);

      expect(result.holesPlayed).toBe(1);
      expect(result.parPlayed).toBe(4);
    });

    it('should charge a picked-up hole as a net double bogey, not as zero strokes', () => {
      const participant = { participantId: 'p-1', handicap: 0 };
      const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: null }];

      const result = StablefordCalculator.computeParticipantTotals(participant, holes, holeScores);

      expect(result.totalStrokes).toBe(6);
      expect(result.netStrokes).toBe(6);
      expect(result.stablefordPoints).toBe(0);
    });

    it('should raise the charge with the strokes received on that hole', () => {
      const participant = { participantId: 'p-1', handicap: 18 };
      const allocation = { 'p-1': { strokesByHole: { 1: 1 } } };
      const holeScores = [{ holeNumber: 1, participantId: 'p-1', score: null }];

      const result = StablefordCalculator.computeParticipantTotals(
        participant,
        holes,
        holeScores,
        allocation
      );

      expect(result.totalStrokes).toBe(7);
      expect(result.netStrokes).toBe(6);
      expect(result.stablefordPoints).toBe(0);
    });

    it('should still ignore a hole with no recorded entry at all', () => {
      // La trampa del cambio: sin entrada y con entrada sin numero, el `score`
      // es nulo en los dos casos y significan lo contrario.
      const participant = { participantId: 'p-1', handicap: 0 };

      const sinAnotar = StablefordCalculator.computeParticipantTotals(participant, holes, []);
      const conRaya = StablefordCalculator.computeParticipantTotals(participant, holes, [
        { holeNumber: 1, participantId: 'p-1', score: null },
      ]);

      expect(sinAnotar.holesPlayed).toBe(0);
      expect(conRaya.holesPlayed).toBe(1);
    });

    it('should match the values the backend produces for a picked-up hole', () => {
      // Mismos numeros que `test_a_picked_up_hole_matches_the_frontend_too`.
      // Si uno de los dos motores cambia de criterio, esto se cae.
      const scratch = StablefordCalculator.computeParticipantTotals(
        { participantId: 'p-1', handicap: 0 },
        parityHoles(),
        parityScores(1)
      );

      expect(scratch.stablefordPoints).toBe(19);
      expect(scratch.totalStrokes).toBe(89);
      expect(scratch.netStrokes).toBe(89);
      expect(scratch.netStrokes - scratch.parPlayed).toBe(17);
    });

    it('should match the backend for a picked-up hole where a stroke is received', () => {
      // Handicap 12.4 recibe un golpe en el hoyo 1 (stroke index 7), asi que su
      // raya vale 7 y no 6.
      const allocation = {
        'p-1': {
          strokesByHole: Object.fromEntries(
            STROKE_INDEXES.map((si, i) => [i + 1, si <= 12 ? 1 : 0])
          ),
        },
      };

      const result = StablefordCalculator.computeParticipantTotals(
        { participantId: 'p-1', handicap: 12.4 },
        parityHoles(),
        parityScores(1),
        allocation
      );

      expect(result.stablefordPoints).toBe(30);
      expect(result.totalStrokes).toBe(90);
      expect(result.netStrokes).toBe(78);
      expect(result.netStrokes - result.parPlayed).toBe(6);
    });
  });
});
