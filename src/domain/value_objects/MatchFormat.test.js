import { describe, it, expect } from 'vitest';
import { MatchFormat, MatchFormatEnum } from './MatchFormat';

describe('MatchFormat', () => {
  describe('Constructor', () => {
    it('should create MatchFormat for each valid value', () => {
      Object.values(MatchFormatEnum).forEach(val => {
        const mf = new MatchFormat(val);
        expect(mf.value()).toBe(val);
      });
    });

    it('should throw for invalid value', () => {
      expect(() => new MatchFormat('SCRAMBLE')).toThrow('Invalid match format: SCRAMBLE');
    });

    it('should be frozen after construction', () => {
      expect(Object.isFrozen(new MatchFormat('SINGLES'))).toBe(true);
    });
  });

  describe('Query methods', () => {
    it('isSingles()', () => {
      expect(MatchFormat.SINGLES.isSingles()).toBe(true);
      expect(MatchFormat.FOURBALL.isSingles()).toBe(false);
    });

    it('isFourball()', () => {
      expect(MatchFormat.FOURBALL.isFourball()).toBe(true);
      expect(MatchFormat.SINGLES.isFourball()).toBe(false);
    });

    it('isFoursomes()', () => {
      expect(MatchFormat.FOURSOMES.isFoursomes()).toBe(true);
      expect(MatchFormat.SINGLES.isFoursomes()).toBe(false);
    });
  });

  describe('playersPerTeam', () => {
    it('should return 1 for SINGLES', () => {
      expect(MatchFormat.SINGLES.playersPerTeam()).toBe(1);
    });

    it('should return 2 for FOURBALL', () => {
      expect(MatchFormat.FOURBALL.playersPerTeam()).toBe(2);
    });

    it('should return 2 for FOURSOMES', () => {
      expect(MatchFormat.FOURSOMES.playersPerTeam()).toBe(2);
    });
  });

  describe('toString', () => {
    it('should return the value string', () => {
      expect(MatchFormat.SINGLES.toString()).toBe('SINGLES');
      expect(MatchFormat.FOURBALL.toString()).toBe('FOURBALL');
      expect(MatchFormat.FOURSOMES.toString()).toBe('FOURSOMES');
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      const a = new MatchFormat('SINGLES');
      expect(a.equals(MatchFormat.SINGLES)).toBe(true);
    });

    it('should return true for same reference', () => {
      expect(MatchFormat.FOURBALL.equals(MatchFormat.FOURBALL)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(MatchFormat.SINGLES.equals(MatchFormat.FOURBALL)).toBe(false);
    });

    it('should return false for non-MatchFormat', () => {
      expect(MatchFormat.SINGLES.equals(null)).toBe(false);
      expect(MatchFormat.SINGLES.equals(undefined)).toBe(false);
      expect(MatchFormat.SINGLES.equals({ value: 'SINGLES' })).toBe(false);
    });
  });

  describe('Static instances', () => {
    it('should have frozen static instances', () => {
      expect(Object.isFrozen(MatchFormat.SINGLES)).toBe(true);
      expect(Object.isFrozen(MatchFormat.FOURBALL)).toBe(true);
      expect(Object.isFrozen(MatchFormat.FOURSOMES)).toBe(true);
    });

    it('should have frozen class', () => {
      expect(Object.isFrozen(MatchFormat)).toBe(true);
    });
  });
});
