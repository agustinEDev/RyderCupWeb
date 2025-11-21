// src/domain/value_objects/Location.test.js

import { describe, it, expect } from 'vitest';
import { Location } from './Location';
import { CountryCode } from './CountryCode';
import { InvalidLocationError } from './InvalidLocationError';

describe('Location', () => {
  const es = new CountryCode('ES');
  const pt = new CountryCode('PT');
  const fr = new CountryCode('FR');
  const de = new CountryCode('DE');

  describe('Constructor and Validation', () => {
    it('should create a Location with a single main country', () => {
      const location = new Location(es);
      expect(location).toBeInstanceOf(Location);
      expect(location.mainCountry().equals(es)).toBe(true);
      expect(location.adjacentCountry1()).toBeNull();
      expect(location.adjacentCountry2()).toBeNull();
    });

    it('should create a Location with one adjacent country', () => {
      const location = new Location(es, pt);
      expect(location.mainCountry().equals(es)).toBe(true);
      expect(location.adjacentCountry1().equals(pt)).toBe(true);
      expect(location.adjacentCountry2()).toBeNull();
    });

    it('should create a Location with two adjacent countries', () => {
      const location = new Location(es, pt, fr);
      expect(location.mainCountry().equals(es)).toBe(true);
      expect(location.adjacentCountry1().equals(pt)).toBe(true);
      expect(location.adjacentCountry2().equals(fr)).toBe(true);
    });

    it('should throw InvalidLocationError if mainCountry is not a CountryCode instance', () => {
      expect(() => new Location('ES')).toThrow(InvalidLocationError);
      expect(() => new Location('ES')).toThrow('Main country must be an instance of CountryCode.');
    });

    it('should throw InvalidLocationError if adjacentCountry1 is not CountryCode or null', () => {
      expect(() => new Location(es, 'PT')).toThrow(InvalidLocationError);
      expect(() => new Location(es, 'PT')).toThrow('Adjacent country 1 must be an instance of CountryCode or null.');
    });

    it('should throw InvalidLocationError if adjacentCountry2 is not CountryCode or null', () => {
      expect(() => new Location(es, pt, 'FR')).toThrow(InvalidLocationError);
      expect(() => new Location(es, pt, 'FR')).toThrow('Adjacent country 2 must be an instance of CountryCode or null.');
    });

    it('should throw InvalidLocationError if adjacentCountry2 exists without adjacentCountry1', () => {
      expect(() => new Location(es, null, fr)).toThrow(InvalidLocationError);
      expect(() => new Location(es, null, fr)).toThrow('Cannot have adjacent_country_2 without adjacent_country_1.');
    });

    it('should throw InvalidLocationError if countries are duplicated (main and adj1)', () => {
      expect(() => new Location(es, es)).toThrow(InvalidLocationError);
      expect(() => new Location(es, es)).toThrow('Countries cannot be repeated.');
    });

    it('should throw InvalidLocationError if countries are duplicated (main and adj2)', () => {
      expect(() => new Location(es, pt, es)).toThrow(InvalidLocationError);
      expect(() => new Location(es, pt, es)).toThrow('Countries cannot be repeated.');
    });

    it('should throw InvalidLocationError if countries are duplicated (adj1 and adj2)', () => {
      expect(() => new Location(es, pt, pt)).toThrow(InvalidLocationError);
      expect(() => new Location(es, pt, pt)).toThrow('Countries cannot be repeated.');
    });
  });

  describe('Getters', () => {
    const location = new Location(es, pt, fr);
    it('should return mainCountry', () => {
      expect(location.mainCountry().equals(es)).toBe(true);
    });
    it('should return adjacentCountry1', () => {
      expect(location.adjacentCountry1().equals(pt)).toBe(true);
    });
    it('should return adjacentCountry2', () => {
      expect(location.adjacentCountry2().equals(fr)).toBe(true);
    });
  });

  describe('Helper Methods', () => {
    it('isMultiCountry should return true if there is at least one adjacent country', () => {
      const singleCountry = new Location(es);
      const multiCountry = new Location(es, pt);
      expect(singleCountry.isMultiCountry()).toBe(false);
      expect(multiCountry.isMultiCountry()).toBe(true);
    });

    it('getAllCountries should return all CountryCode instances', () => {
      const loc1 = new Location(es);
      const loc2 = new Location(es, pt);
      const loc3 = new Location(es, pt, fr);
      expect(loc1.getAllCountries().length).toBe(1);
      expect(loc1.getAllCountries()[0].equals(es)).toBe(true);
      expect(loc2.getAllCountries().length).toBe(2);
      expect(loc2.getAllCountries()[0].equals(es)).toBe(true);
      expect(loc2.getAllCountries()[1].equals(pt)).toBe(true);
      expect(loc3.getAllCountries().length).toBe(3);
      expect(loc3.getAllCountries()[2].equals(fr)).toBe(true);
    });

    it('countryCount should return the correct number of countries', () => {
      expect(new Location(es).countryCount()).toBe(1);
      expect(new Location(es, pt).countryCount()).toBe(2);
      expect(new Location(es, pt, fr).countryCount()).toBe(3);
    });

    it('includesCountry should return true if the country is present', () => {
      const location = new Location(es, pt, fr);
      expect(location.includesCountry(es)).toBe(true);
      expect(location.includesCountry(pt)).toBe(true);
      expect(location.includesCountry(fr)).toBe(true);
      expect(location.includesCountry(de)).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for two Location instances with the same countries in the same order', () => {
      const loc1 = new Location(es, pt, fr);
      const loc2 = new Location(new CountryCode('ES'), new CountryCode('PT'), new CountryCode('FR'));
      expect(loc1.equals(loc2)).toBe(true);
    });

    it('should return true for two single-country Location instances with the same country', () => {
      const loc1 = new Location(es);
      const loc2 = new Location(new CountryCode('ES'));
      expect(loc1.equals(loc2)).toBe(true);
    });

    it('should return false for Location instances with different mainCountry', () => {
      const loc1 = new Location(es, pt);
      const loc2 = new Location(fr, pt);
      expect(loc1.equals(loc2)).toBe(false);
    });

    it('should return false for Location instances with different adjacentCountry1', () => {
      const loc1 = new Location(es, pt);
      const loc2 = new Location(es, fr);
      expect(loc1.equals(loc2)).toBe(false);
    });

    it('should return false for Location instances with different adjacentCountry2', () => {
      const loc1 = new Location(es, pt, fr);
      const loc2 = new Location(es, pt, de);
      expect(loc1.equals(loc2)).toBe(false);
    });

    it('should return false for Location instances where one has more countries', () => {
      const loc1 = new Location(es, pt);
      const loc2 = new Location(es);
      expect(loc1.equals(loc2)).toBe(false);
      expect(loc2.equals(loc1)).toBe(false);
    });

    it('should return false when comparing with null or a different object type', () => {
      const location = new Location(es);
      expect(location.equals(null)).toBe(false);
      expect(location.equals(undefined)).toBe(false);
      expect(location.equals('ES')).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return correct string for a single country', () => {
      const location = new Location(es);
      expect(location.toString()).toBe('ES');
    });

    it('should return correct string for two countries', () => {
      const location = new Location(es, pt);
      expect(location.toString()).toBe('ES / PT');
    });

    it('should return correct string for three countries', () => {
      const location = new Location(es, pt, fr);
      expect(location.toString()).toBe('ES / PT / FR');
    });
  });
});
