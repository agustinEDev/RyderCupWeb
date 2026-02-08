import { describe, it, expect } from 'vitest';
import { SessionType, SessionTypeEnum } from './SessionType';

describe('SessionType', () => {
  describe('Constructor', () => {
    it('should create SessionType for each valid value', () => {
      Object.values(SessionTypeEnum).forEach(val => {
        const st = new SessionType(val);
        expect(st.value()).toBe(val);
      });
    });

    it('should throw for invalid value', () => {
      expect(() => new SessionType('NIGHT')).toThrow('Invalid session type: NIGHT');
    });

    it('should be frozen after construction', () => {
      expect(Object.isFrozen(new SessionType('MORNING'))).toBe(true);
    });
  });

  describe('Query methods', () => {
    it('isMorning()', () => {
      expect(SessionType.MORNING.isMorning()).toBe(true);
      expect(SessionType.AFTERNOON.isMorning()).toBe(false);
    });

    it('isAfternoon()', () => {
      expect(SessionType.AFTERNOON.isAfternoon()).toBe(true);
      expect(SessionType.MORNING.isAfternoon()).toBe(false);
    });

    it('isEvening()', () => {
      expect(SessionType.EVENING.isEvening()).toBe(true);
      expect(SessionType.MORNING.isEvening()).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value string', () => {
      expect(SessionType.MORNING.toString()).toBe('MORNING');
      expect(SessionType.AFTERNOON.toString()).toBe('AFTERNOON');
      expect(SessionType.EVENING.toString()).toBe('EVENING');
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      const a = new SessionType('MORNING');
      expect(a.equals(SessionType.MORNING)).toBe(true);
    });

    it('should return true for same reference', () => {
      expect(SessionType.MORNING.equals(SessionType.MORNING)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(SessionType.MORNING.equals(SessionType.AFTERNOON)).toBe(false);
    });

    it('should return false for non-SessionType', () => {
      expect(SessionType.MORNING.equals(null)).toBe(false);
      expect(SessionType.MORNING.equals(undefined)).toBe(false);
      expect(SessionType.MORNING.equals({ value: 'MORNING' })).toBe(false);
    });
  });

  describe('Static instances', () => {
    it('should have frozen static instances', () => {
      expect(Object.isFrozen(SessionType.MORNING)).toBe(true);
      expect(Object.isFrozen(SessionType.AFTERNOON)).toBe(true);
      expect(Object.isFrozen(SessionType.EVENING)).toBe(true);
    });

    it('should have frozen class', () => {
      expect(Object.isFrozen(SessionType)).toBe(true);
    });
  });
});
