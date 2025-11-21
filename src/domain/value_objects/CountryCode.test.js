// src/domain/value_objects/CountryCode.test.js

import { describe, it, expect } from 'vitest';
import { CountryCode, InvalidCountryCodeError } from './CountryCode';

describe('CountryCode', () => {
  describe('Constructor and Validation', () => {
    it('should create a CountryCode with a valid uppercase code', () => {
      const code = new CountryCode('ES');
      expect(code).toBeInstanceOf(CountryCode);
      expect(code.value()).toBe('ES');
    });

    it('should normalize a lowercase code to uppercase', () => {
      const code = new CountryCode('es');
      expect(code.value()).toBe('ES');
    });

    it('should trim whitespace from the code', () => {
      const code = new CountryCode('  DE  ');
      expect(code.value()).toBe('DE');
    });

    it('should throw InvalidCountryCodeError for codes with length > 2', () => {
      expect(() => new CountryCode('ESP')).toThrow(InvalidCountryCodeError);
      expect(() => new CountryCode('ESP')).toThrow('Country code must have exactly 2 characters.');
    });

    it('should throw InvalidCountryCodeError for codes with length < 2', () => {
      expect(() => new CountryCode('E')).toThrow(InvalidCountryCodeError);
    });

    it('should throw InvalidCountryCodeError for codes with numbers', () => {
      expect(() => new CountryCode('E1')).toThrow(InvalidCountryCodeError);
      expect(() => new CountryCode('E1')).toThrow('Country code must contain only letters (A-Z).');
    });

    it('should throw InvalidCountryCodeError for non-string values', () => {
      expect(() => new CountryCode(null)).toThrow(InvalidCountryCodeError);
      expect(() => new CountryCode(undefined)).toThrow(InvalidCountryCodeError);
      expect(() => new CountryCode(12)).toThrow(InvalidCountryCodeError);
    });
    
    it('should throw InvalidCountryCodeError for empty strings', () => {
        expect(() => new CountryCode('')).toThrow(InvalidCountryCodeError);
        expect(() => new CountryCode('  ')).toThrow(InvalidCountryCodeError);
    });
  });

  describe('equals', () => {
    it('should return true for two instances with the same code', () => {
      const code1 = new CountryCode('US');
      const code2 = new CountryCode('us');
      expect(code1.equals(code2)).toBe(true);
    });

    it('should return false for two instances with different codes', () => {
      const code1 = new CountryCode('US');
      const code2 = new CountryCode('ES');
      expect(code1.equals(code2)).toBe(false);
    });

    it('should return false when comparing with null or a different object type', () => {
      const code = new CountryCode('FR');
      expect(code.equals(null)).toBe(false);
      expect(code.equals(undefined)).toBe(false);
      expect(code.equals({ value: 'FR' })).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value of the code', () => {
      const code = new CountryCode('PT');
      expect(code.toString()).toBe('PT');
    });
  });
});
