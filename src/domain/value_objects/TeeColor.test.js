import { describe, it, expect } from 'vitest';

import TeeColor from './TeeColor';

describe('TeeColor', () => {
  describe('Constructor', () => {
    it('should create a TeeColor with each valid value', () => {
      TeeColor.getAllValues().forEach((value) => {
        expect(new TeeColor(value).toString()).toBe(value);
      });
    });

    it('should throw for an invalid value', () => {
      expect(() => new TeeColor('PURPLE')).toThrow('Invalid TeeColor');
    });

    it('should throw for the categories that no longer exist', () => {
      // Las categorías se retiraron: ninguna federación las publica
      ['CHAMPIONSHIP', 'AMATEUR', 'SENIOR', 'FORWARD', 'JUNIOR'].forEach((old) => {
        expect(() => new TeeColor(old)).toThrow('Invalid TeeColor');
      });
    });

    it('should throw for empty string', () => {
      expect(() => new TeeColor('')).toThrow('Invalid TeeColor');
    });

    it('should throw for null', () => {
      expect(() => new TeeColor(null)).toThrow('Invalid TeeColor');
    });

    it('should throw for undefined', () => {
      expect(() => new TeeColor(undefined)).toThrow('Invalid TeeColor');
    });

    it('should throw for lowercase values', () => {
      expect(() => new TeeColor('white')).toThrow('Invalid TeeColor');
    });

    it('error message should list valid values', () => {
      expect(() => new TeeColor('NOPE')).toThrow(/WHITE/);
    });
  });

  describe('fromString', () => {
    it('should create a TeeColor from a valid string', () => {
      expect(TeeColor.fromString(TeeColor.BLUE).toString()).toBe('BLUE');
    });

    it('should throw for an invalid string', () => {
      expect(() => TeeColor.fromString('NOPE')).toThrow('Invalid TeeColor');
    });
  });

  describe('isValid', () => {
    it('should accept every valid colour', () => {
      TeeColor.getAllValues().forEach((value) => {
        expect(TeeColor.isValid(value)).toBe(true);
      });
    });

    it('should reject anything else', () => {
      ['PURPLE', '', null, undefined, 'white', 'AMATEUR'].forEach((value) => {
        expect(TeeColor.isValid(value)).toBe(false);
      });
    });
  });

  describe('getAllValues', () => {
    it('should include the ten supported colours', () => {
      expect(TeeColor.getAllValues()).toHaveLength(10);
    });

    it('should include OTHER for tees that are not named after a colour', () => {
      // Las "Championship" británicas o las combinadas estadounidenses
      expect(TeeColor.getAllValues()).toContain(TeeColor.OTHER);
    });

    it('should return a copy, so callers cannot mutate the source', () => {
      const values = TeeColor.getAllValues();
      values.push('PURPLE');
      expect(TeeColor.getAllValues()).not.toContain('PURPLE');
    });
  });

  describe('swatchFor', () => {
    it('should give each colour its own swatch', () => {
      expect(TeeColor.swatchFor(TeeColor.RED)).toBe('#d16161');
      expect(TeeColor.swatchFor(TeeColor.YELLOW)).toBe('#f6eb34');
      expect(TeeColor.swatchFor(TeeColor.BLACK)).toBe('#000000');
    });

    it('should fall back to the neutral swatch for anything unknown', () => {
      expect(TeeColor.swatchFor('PURPLE')).toBe(TeeColor.swatchFor(TeeColor.OTHER));
    });
  });

  describe('equals', () => {
    it('should be true for the same colour', () => {
      expect(new TeeColor(TeeColor.RED).equals(new TeeColor(TeeColor.RED))).toBe(true);
    });

    it('should be false for a different colour', () => {
      expect(new TeeColor(TeeColor.RED).equals(new TeeColor(TeeColor.BLUE))).toBe(false);
    });

    it('should be false for anything that is not a TeeColor', () => {
      expect(new TeeColor(TeeColor.RED).equals('RED')).toBe(false);
    });
  });

  describe('Immutability', () => {
    it('should not expose a setter for its value', () => {
      const colour = new TeeColor(TeeColor.RED);
      expect(Object.keys(colour)).toHaveLength(0);
      expect(colour.toString()).toBe('RED');
    });
  });
});
