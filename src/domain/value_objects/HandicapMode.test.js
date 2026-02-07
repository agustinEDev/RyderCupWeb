import { describe, it, expect } from 'vitest';
import { HandicapMode, HandicapModeEnum } from './HandicapMode';

describe('HandicapMode', () => {
  describe('Constructor', () => {
    it('should create HandicapMode for each valid value', () => {
      Object.values(HandicapModeEnum).forEach(val => {
        const hm = new HandicapMode(val);
        expect(hm.value()).toBe(val);
      });
    });

    it('should throw for invalid value', () => {
      expect(() => new HandicapMode('STABLEFORD')).toThrow('Invalid handicap mode: STABLEFORD');
      expect(() => new HandicapMode('STROKE_PLAY')).toThrow('Invalid handicap mode: STROKE_PLAY');
    });

    it('should be frozen after construction', () => {
      expect(Object.isFrozen(new HandicapMode('MATCH_PLAY'))).toBe(true);
    });
  });

  describe('Query methods', () => {
    it('isMatchPlay()', () => {
      expect(HandicapMode.MATCH_PLAY.isMatchPlay()).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return the value string', () => {
      expect(HandicapMode.MATCH_PLAY.toString()).toBe('MATCH_PLAY');
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      const a = new HandicapMode('MATCH_PLAY');
      expect(a.equals(HandicapMode.MATCH_PLAY)).toBe(true);
    });

    it('should return true for same reference', () => {
      expect(HandicapMode.MATCH_PLAY.equals(HandicapMode.MATCH_PLAY)).toBe(true);
    });

    it('should return false for non-HandicapMode', () => {
      expect(HandicapMode.MATCH_PLAY.equals(null)).toBe(false);
      expect(HandicapMode.MATCH_PLAY.equals(undefined)).toBe(false);
      expect(HandicapMode.MATCH_PLAY.equals({ value: 'MATCH_PLAY' })).toBe(false);
    });
  });

  describe('Static instances', () => {
    it('should have frozen static instances', () => {
      expect(Object.isFrozen(HandicapMode.MATCH_PLAY)).toBe(true);
    });

    it('should have frozen class', () => {
      expect(Object.isFrozen(HandicapMode)).toBe(true);
    });
  });
});
