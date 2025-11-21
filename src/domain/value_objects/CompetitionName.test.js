// src/domain/value_objects/CompetitionName.test.js

import { describe, it, expect } from 'vitest';
import { CompetitionName } from './CompetitionName';

describe('CompetitionName', () => {
  describe('Constructor and Validation', () => {
    it('should create a CompetitionName with a valid name', () => {
      const name = new CompetitionName('Ryder Cup 2025');
      expect(name).toBeInstanceOf(CompetitionName);
      expect(name.value()).toBe('Ryder Cup 2025');
    });

    it('should trim whitespace from the name', () => {
      const name = new CompetitionName('  Test Competition  ');
      expect(name.value()).toBe('Test Competition');
    });

    it('should throw an error if the name is too short', () => {
      expect(() => new CompetitionName('AB')).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
    });

    it('should throw an error if the name is too long', () => {
      const longName = 'a'.repeat(CompetitionName.MAX_LENGTH + 1);
      expect(() => new CompetitionName(longName)).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
    });

    it('should throw an error if the name is empty', () => {
      expect(() => new CompetitionName('')).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
    });

    it('should throw an error if the name is just whitespace', () => {
      expect(() => new CompetitionName('   ')).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
    });

    it('should throw an error for non-string values', () => {
      expect(() => new CompetitionName(null)).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
      expect(() => new CompetitionName(undefined)).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
      expect(() => new CompetitionName(123)).toThrow(
        `Competition name must be between ${CompetitionName.MIN_LENGTH} and ${CompetitionName.MAX_LENGTH} characters long.`
      );
    });
  });

  describe('equals', () => {
    it('should return true for two instances with the same name', () => {
      const name1 = new CompetitionName('Test Name');
      const name2 = new CompetitionName('Test Name');
      expect(name1.equals(name2)).toBe(true);
    });

    it('should return true for two instances with names that differ only by whitespace', () => {
      const name1 = new CompetitionName('  Test Name  ');
      const name2 = new CompetitionName('Test Name');
      expect(name1.equals(name2)).toBe(true);
    });

    it('should return false for two instances with different names', () => {
      const name1 = new CompetitionName('Test Name 1');
      const name2 = new CompetitionName('Test Name 2');
      expect(name1.equals(name2)).toBe(false);
    });

    it('should return false when comparing with null or a different object type', () => {
      const name = new CompetitionName('Unique Name');
      expect(name.equals(null)).toBe(false);
      expect(name.equals(undefined)).toBe(false);
      expect(name.equals('Unique Name')).toBe(false);
      expect(name.equals({ value: 'Unique Name' })).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value of the name', () => {
      const name = new CompetitionName('My Competition');
      expect(name.toString()).toBe('My Competition');
    });
  });
});
