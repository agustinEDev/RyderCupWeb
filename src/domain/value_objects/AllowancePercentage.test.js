import { describe, it, expect } from 'vitest';
import { AllowancePercentage } from './AllowancePercentage';

describe('AllowancePercentage', () => {
  describe('Constructor', () => {
    it('should create with null (WHS default)', () => {
      const ap = new AllowancePercentage(null);
      expect(ap.value()).toBeNull();
      expect(ap.isCustom()).toBe(false);
    });

    it('should create with undefined (WHS default)', () => {
      const ap = new AllowancePercentage(undefined);
      expect(ap.value()).toBeNull();
      expect(ap.isCustom()).toBe(false);
    });

    it('should create with valid values (50-100, increments of 5)', () => {
      const validValues = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
      validValues.forEach(val => {
        const ap = new AllowancePercentage(val);
        expect(ap.value()).toBe(val);
        expect(ap.isCustom()).toBe(true);
      });
    });

    it('should throw for value below 50', () => {
      expect(() => new AllowancePercentage(45)).toThrow('must be between 50 and 100');
    });

    it('should throw for value above 100', () => {
      expect(() => new AllowancePercentage(105)).toThrow('must be between 50 and 100');
    });

    it('should throw for non-increment of 5', () => {
      expect(() => new AllowancePercentage(57)).toThrow('must be in increments of 5');
      expect(() => new AllowancePercentage(93)).toThrow('must be in increments of 5');
    });

    it('should throw for non-number', () => {
      expect(() => new AllowancePercentage('90')).toThrow('must be a number');
    });

    it('should throw for NaN', () => {
      expect(() => new AllowancePercentage(NaN)).toThrow('must be a number');
    });

    it('should throw for Infinity', () => {
      expect(() => new AllowancePercentage(Infinity)).toThrow('must be a number');
    });

    it('should be frozen after construction', () => {
      expect(Object.isFrozen(new AllowancePercentage(90))).toBe(true);
      expect(Object.isFrozen(new AllowancePercentage(null))).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return "WHS Default" for null', () => {
      expect(new AllowancePercentage(null).toString()).toBe('WHS Default');
    });

    it('should return percentage string for custom value', () => {
      expect(new AllowancePercentage(85).toString()).toBe('85%');
      expect(new AllowancePercentage(100).toString()).toBe('100%');
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      const a = new AllowancePercentage(90);
      const b = new AllowancePercentage(90);
      expect(a.equals(b)).toBe(true);
    });

    it('should return true for both null', () => {
      const a = new AllowancePercentage(null);
      const b = new AllowancePercentage(null);
      expect(a.equals(b)).toBe(true);
    });

    it('should return true for same reference', () => {
      const a = new AllowancePercentage(75);
      expect(a.equals(a)).toBe(true);
    });

    it('should return false for different values', () => {
      const a = new AllowancePercentage(90);
      const b = new AllowancePercentage(85);
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for null vs custom', () => {
      const a = new AllowancePercentage(null);
      const b = new AllowancePercentage(90);
      expect(a.equals(b)).toBe(false);
    });

    it('should return false for non-AllowancePercentage', () => {
      const a = new AllowancePercentage(90);
      expect(a.equals(null)).toBe(false);
      expect(a.equals(undefined)).toBe(false);
      expect(a.equals({ value: 90 })).toBe(false);
    });
  });
});
