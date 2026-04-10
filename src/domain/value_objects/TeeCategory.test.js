// src/domain/value_objects/TeeCategory.test.js

import { describe, it, expect } from 'vitest';
import TeeCategory from './TeeCategory';

describe('TeeCategory', () => {
  describe('Constructor', () => {
    it('should create a TeeCategory with each valid value', () => {
      const validValues = ['CHAMPIONSHIP', 'AMATEUR', 'SENIOR', 'FORWARD', 'JUNIOR'];

      validValues.forEach((value) => {
        const category = new TeeCategory(value);
        expect(category).toBeInstanceOf(TeeCategory);
        expect(category.toString()).toBe(value);
      });
    });

    it('should throw for an invalid value', () => {
      expect(() => new TeeCategory('INVALID')).toThrow('Invalid TeeCategory: "INVALID"');
    });

    it('should throw for empty string', () => {
      expect(() => new TeeCategory('')).toThrow('Invalid TeeCategory: ""');
    });

    it('should throw for null', () => {
      expect(() => new TeeCategory(null)).toThrow();
    });

    it('should throw for undefined', () => {
      expect(() => new TeeCategory(undefined)).toThrow();
    });

    it('should throw for lowercase values', () => {
      expect(() => new TeeCategory('amateur')).toThrow('Invalid TeeCategory: "amateur"');
    });

    it('error message should list valid values', () => {
      expect(() => new TeeCategory('PRO')).toThrow(
        'Valid values: CHAMPIONSHIP, AMATEUR, SENIOR, FORWARD, JUNIOR'
      );
    });
  });

  describe('Static factory methods', () => {
    it('championship() should create CHAMPIONSHIP category', () => {
      const category = TeeCategory.championship();
      expect(category).toBeInstanceOf(TeeCategory);
      expect(category.toString()).toBe('CHAMPIONSHIP');
    });

    it('amateur() should create AMATEUR category', () => {
      const category = TeeCategory.amateur();
      expect(category).toBeInstanceOf(TeeCategory);
      expect(category.toString()).toBe('AMATEUR');
    });

    it('senior() should create SENIOR category', () => {
      const category = TeeCategory.senior();
      expect(category).toBeInstanceOf(TeeCategory);
      expect(category.toString()).toBe('SENIOR');
    });

    it('forward() should create FORWARD category', () => {
      const category = TeeCategory.forward();
      expect(category).toBeInstanceOf(TeeCategory);
      expect(category.toString()).toBe('FORWARD');
    });

    it('junior() should create JUNIOR category', () => {
      const category = TeeCategory.junior();
      expect(category).toBeInstanceOf(TeeCategory);
      expect(category.toString()).toBe('JUNIOR');
    });

    it('each factory method should produce a new instance each time', () => {
      const a = TeeCategory.amateur();
      const b = TeeCategory.amateur();
      expect(a).not.toBe(b);
      expect(a.equals(b)).toBe(true);
    });
  });

  describe('fromString', () => {
    it('should create a TeeCategory from a valid string', () => {
      const category = TeeCategory.fromString('SENIOR');
      expect(category).toBeInstanceOf(TeeCategory);
      expect(category.toString()).toBe('SENIOR');
    });

    it('should throw for an invalid string', () => {
      expect(() => TeeCategory.fromString('PROFESSIONAL')).toThrow('Invalid TeeCategory: "PROFESSIONAL"');
    });

    it('should throw for null (caller must guard null before calling)', () => {
      expect(() => TeeCategory.fromString(null)).toThrow();
    });
  });

  describe('isValid', () => {
    it('should return true for all valid values', () => {
      expect(TeeCategory.isValid('CHAMPIONSHIP')).toBe(true);
      expect(TeeCategory.isValid('AMATEUR')).toBe(true);
      expect(TeeCategory.isValid('SENIOR')).toBe(true);
      expect(TeeCategory.isValid('FORWARD')).toBe(true);
      expect(TeeCategory.isValid('JUNIOR')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(TeeCategory.isValid('PROFESSIONAL')).toBe(false);
      expect(TeeCategory.isValid('amateur')).toBe(false);
      expect(TeeCategory.isValid('')).toBe(false);
      expect(TeeCategory.isValid(null)).toBe(false);
      expect(TeeCategory.isValid(undefined)).toBe(false);
    });
  });

  describe('getAllValues', () => {
    it('should return all 5 valid values', () => {
      const values = TeeCategory.getAllValues();
      expect(values).toHaveLength(5);
      expect(values).toContain('CHAMPIONSHIP');
      expect(values).toContain('AMATEUR');
      expect(values).toContain('SENIOR');
      expect(values).toContain('FORWARD');
      expect(values).toContain('JUNIOR');
    });

    it('should return a copy — mutating the result does not affect the class', () => {
      const values = TeeCategory.getAllValues();
      values.push('HACKED');
      expect(TeeCategory.getAllValues()).toHaveLength(5);
    });
  });

  describe('toString', () => {
    it('should return the raw string value', () => {
      expect(TeeCategory.championship().toString()).toBe('CHAMPIONSHIP');
      expect(TeeCategory.amateur().toString()).toBe('AMATEUR');
      expect(TeeCategory.senior().toString()).toBe('SENIOR');
      expect(TeeCategory.forward().toString()).toBe('FORWARD');
      expect(TeeCategory.junior().toString()).toBe('JUNIOR');
    });

    it('should be usable in template literals', () => {
      const category = TeeCategory.amateur();
      expect(`${category}`).toBe('AMATEUR');
    });
  });

  describe('equals', () => {
    it('should return true for two instances with the same value', () => {
      const a = TeeCategory.amateur();
      const b = TeeCategory.amateur();
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for two instances with different values', () => {
      const a = TeeCategory.amateur();
      const b = TeeCategory.championship();
      expect(a.equals(b)).toBe(false);
    });

    it('should return false when comparing with null', () => {
      expect(TeeCategory.amateur().equals(null)).toBe(false);
    });

    it('should return false when comparing with undefined', () => {
      expect(TeeCategory.amateur().equals(undefined)).toBe(false);
    });

    it('should return false when comparing with a raw string', () => {
      expect(TeeCategory.amateur().equals('AMATEUR')).toBe(false);
    });

    it('should return false when comparing with a plain object', () => {
      expect(TeeCategory.amateur().equals({ value: 'AMATEUR' })).toBe(false);
    });
  });

  describe('Immutability', () => {
    it('should not allow modification of the internal value', () => {
      const category = TeeCategory.amateur();
      const original = category.toString();

      // Attempt to assign a new property (no effect on private field)
      category.value = 'CHAMPIONSHIP';

      expect(category.toString()).toBe(original);
    });

    it('static constants should match the corresponding factory method values', () => {
      expect(TeeCategory.CHAMPIONSHIP).toBe(TeeCategory.championship().toString());
      expect(TeeCategory.AMATEUR).toBe(TeeCategory.amateur().toString());
      expect(TeeCategory.SENIOR).toBe(TeeCategory.senior().toString());
      expect(TeeCategory.FORWARD).toBe(TeeCategory.forward().toString());
      expect(TeeCategory.JUNIOR).toBe(TeeCategory.junior().toString());
    });
  });
});
