import { describe, it, expect } from 'vitest';
import HoleScore from './HoleScore';

describe('HoleScore', () => {
  describe('constructor', () => {
    it('should accept valid scores 1-9', () => {
      for (let i = 1; i <= 9; i++) {
        const score = new HoleScore(i);
        expect(score.getValue()).toBe(i);
      }
    });

    it('should accept null as picked up ball', () => {
      const score = new HoleScore(null);
      expect(score.getValue()).toBeNull();
      expect(score.isPickedUp()).toBe(true);
    });

    it('should accept undefined as picked up ball', () => {
      const score = new HoleScore(undefined);
      expect(score.getValue()).toBeNull();
      expect(score.isPickedUp()).toBe(true);
    });

    it('should accept string numbers and convert to integer', () => {
      const score = new HoleScore('5');
      expect(score.getValue()).toBe(5);
    });

    it('should reject score of 0', () => {
      expect(() => new HoleScore(0)).toThrow('Invalid HoleScore: 0');
    });

    it('should reject negative scores', () => {
      expect(() => new HoleScore(-1)).toThrow('Invalid HoleScore: -1');
    });

    it('should reject score greater than 9', () => {
      expect(() => new HoleScore(10)).toThrow('Invalid HoleScore: 10');
    });

    it('should reject non-integer numbers', () => {
      expect(() => new HoleScore(3.5)).toThrow('Invalid HoleScore: 3.5');
    });

    it('should reject non-numeric strings', () => {
      expect(() => new HoleScore('abc')).toThrow('Invalid HoleScore: abc');
    });
  });

  describe('static factory methods', () => {
    it('should create via HoleScore.of()', () => {
      const score = HoleScore.of(7);
      expect(score.getValue()).toBe(7);
    });

    it('should create picked up via HoleScore.pickedUp()', () => {
      const score = HoleScore.pickedUp();
      expect(score.isPickedUp()).toBe(true);
      expect(score.getValue()).toBeNull();
    });
  });

  describe('isPickedUp', () => {
    it('should return true for null score', () => {
      expect(new HoleScore(null).isPickedUp()).toBe(true);
    });

    it('should return false for valid score', () => {
      expect(new HoleScore(4).isPickedUp()).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return score as string', () => {
      expect(new HoleScore(5).toString()).toBe('5');
    });

    it('should return dash for picked up', () => {
      expect(new HoleScore(null).toString()).toBe('-');
    });
  });

  describe('equals', () => {
    it('should return true for equal scores', () => {
      expect(new HoleScore(4).equals(new HoleScore(4))).toBe(true);
    });

    it('should return false for different scores', () => {
      expect(new HoleScore(4).equals(new HoleScore(5))).toBe(false);
    });

    it('should return true for both null', () => {
      expect(new HoleScore(null).equals(new HoleScore(null))).toBe(true);
    });

    it('should return false for null vs non-null', () => {
      expect(new HoleScore(null).equals(new HoleScore(5))).toBe(false);
    });

    it('should return false for non-HoleScore objects', () => {
      expect(new HoleScore(5).equals(5)).toBe(false);
    });
  });

  describe('constants', () => {
    it('should have MIN of 1', () => {
      expect(HoleScore.MIN).toBe(1);
    });

    it('should have MAX of 9', () => {
      expect(HoleScore.MAX).toBe(9);
    });
  });
});
