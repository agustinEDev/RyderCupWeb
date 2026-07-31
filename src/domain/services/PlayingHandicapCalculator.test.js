import { describe, it, expect } from 'vitest';
import PlayingHandicapCalculator from './PlayingHandicapCalculator';

describe('PlayingHandicapCalculator', () => {
  describe('roundHalfAwayFromZero', () => {
    it('should round positive .5 ties up', () => {
      expect(PlayingHandicapCalculator.roundHalfAwayFromZero(2.5)).toBe(3);
    });

    it('should round negative .5 ties down (away from zero)', () => {
      expect(PlayingHandicapCalculator.roundHalfAwayFromZero(-2.5)).toBe(-3);
    });

    it('should round non-tie values normally', () => {
      expect(PlayingHandicapCalculator.roundHalfAwayFromZero(2.3)).toBe(2);
      expect(PlayingHandicapCalculator.roundHalfAwayFromZero(-2.3)).toBe(-2);
    });
  });

  describe('calculate', () => {
    const teeRating = { courseRating: 71.2, slopeRating: 128, par: 72 };

    it('should return null when handicapIndex is null', () => {
      expect(PlayingHandicapCalculator.calculate(null, teeRating, 100)).toBeNull();
    });

    it('should return null when teeRating is null', () => {
      expect(PlayingHandicapCalculator.calculate(12.4, null, 100)).toBeNull();
    });

    it('should compute the WHS course handicap with 100% allowance', () => {
      // CH = 12.4 * (128/113) + (71.2 - 72) = 14.033... - 0.8 = 13.233...
      const result = PlayingHandicapCalculator.calculate(12.4, teeRating, 100);
      expect(result).toBe(13);
    });

    it('should apply a reduced allowance percentage', () => {
      // Same course handicap (~13.23), 90% allowance -> ~11.9 -> 12
      const result = PlayingHandicapCalculator.calculate(12.4, teeRating, 90);
      expect(result).toBe(12);
    });

    it('should allow a negative result for a plus-handicap player (no floor at 0)', () => {
      // HI -3, neutral-ish tee -> course handicap stays negative
      const scratchTee = { courseRating: 72.0, slopeRating: 113, par: 72 };
      const result = PlayingHandicapCalculator.calculate(-3, scratchTee, 100);
      expect(result).toBe(-3);
    });
  });
});
