import { describe, it, expect } from 'vitest';
import { canUseRFEG, getCountryFlag, getCountryInfo, getCountriesInfo } from './countryUtils';

describe('countryUtils', () => {
  describe('canUseRFEG', () => {
    it('should return true for Spanish user (country_code: ES)', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        country_code: 'ES'
      };

      expect(canUseRFEG(user)).toBe(true);
    });

    it('should return true for Spanish user with lowercase country_code (es)', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        country_code: 'es'
      };

      expect(canUseRFEG(user)).toBe(true);
    });

    it('should return false for non-Spanish user (country_code: FR)', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        country_code: 'FR'
      };

      expect(canUseRFEG(user)).toBe(false);
    });

    it('should return false if user has no country_code', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        country_code: null
      };

      expect(canUseRFEG(user)).toBe(false);
    });

    it('should return false if country_code is undefined', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User'
        // country_code is undefined
      };

      expect(canUseRFEG(user)).toBe(false);
    });

    it('should return false if country_code is empty string', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        country_code: ''
      };

      expect(canUseRFEG(user)).toBe(false);
    });

    it('should return false if user is null', () => {
      expect(canUseRFEG(null)).toBe(false);
    });

    it('should return false if user is undefined', () => {
      expect(canUseRFEG(undefined)).toBe(false);
    });

    it('should return false if user is not an object (string)', () => {
      expect(canUseRFEG('not an object')).toBe(false);
    });

    it('should return false if user is not an object (number)', () => {
      expect(canUseRFEG(123)).toBe(false);
    });

    it('should return false if user is an array', () => {
      expect(canUseRFEG([])).toBe(false);
    });
  });

  describe('getCountryFlag', () => {
    it('should return flag emoji for valid country code (ES)', () => {
      const flag = getCountryFlag('ES');
      expect(flag).toBe('🇪🇸');
    });

    it('should return flag emoji for valid country code (FR)', () => {
      const flag = getCountryFlag('FR');
      expect(flag).toBe('🇫🇷');
    });

    it('should return flag emoji for valid country code (US)', () => {
      const flag = getCountryFlag('US');
      expect(flag).toBe('🇺🇸');
    });

    it('should handle lowercase country codes', () => {
      const flag = getCountryFlag('es');
      expect(flag).toBe('🇪🇸');
    });

    it('should return empty string for invalid country code (too long)', () => {
      const flag = getCountryFlag('ESP');
      expect(flag).toBe('');
    });

    it('should return empty string for invalid country code (too short)', () => {
      const flag = getCountryFlag('E');
      expect(flag).toBe('');
    });

    it('should return empty string for null', () => {
      const flag = getCountryFlag(null);
      expect(flag).toBe('');
    });

    it('should return empty string for undefined', () => {
      const flag = getCountryFlag(undefined);
      expect(flag).toBe('');
    });

    it('should return empty string for non-string input', () => {
      const flag = getCountryFlag(123);
      expect(flag).toBe('');
    });
  });

  describe('getCountryInfo', () => {
    it('should return country info object for valid country code', () => {
      const info = getCountryInfo('ES');
      expect(info).toEqual({
        code: 'ES',
        flag: '🇪🇸'
      });
    });

    it('should return null for invalid country code', () => {
      const info = getCountryInfo('INVALID');
      expect(info).toBe(null);
    });

    it('should return null for null country code', () => {
      const info = getCountryInfo(null);
      expect(info).toBe(null);
    });

    it('should return null for undefined country code', () => {
      const info = getCountryInfo(undefined);
      expect(info).toBe(null);
    });
  });

  describe('getCountriesInfo', () => {
    it('should return array of country info objects for valid country codes', () => {
      const info = getCountriesInfo(['ES', 'FR', 'IT']);
      expect(info).toEqual([
        { code: 'ES', flag: '🇪🇸' },
        { code: 'FR', flag: '🇫🇷' },
        { code: 'IT', flag: '🇮🇹' }
      ]);
    });

    it('should filter out null/undefined values', () => {
      const info = getCountriesInfo(['ES', null, 'FR', undefined, 'IT']);
      expect(info).toEqual([
        { code: 'ES', flag: '🇪🇸' },
        { code: 'FR', flag: '🇫🇷' },
        { code: 'IT', flag: '🇮🇹' }
      ]);
    });

    it('should filter out empty strings', () => {
      const info = getCountriesInfo(['ES', '', 'FR']);
      expect(info).toEqual([
        { code: 'ES', flag: '🇪🇸' },
        { code: 'FR', flag: '🇫🇷' }
      ]);
    });

    it('should return empty array for invalid input (not an array)', () => {
      const info = getCountriesInfo('not an array');
      expect(info).toEqual([]);
    });

    it('should return empty array for null input', () => {
      const info = getCountriesInfo(null);
      expect(info).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      const info = getCountriesInfo(undefined);
      expect(info).toEqual([]);
    });

    it('should return empty array for empty array input', () => {
      const info = getCountriesInfo([]);
      expect(info).toEqual([]);
    });
  });
});
