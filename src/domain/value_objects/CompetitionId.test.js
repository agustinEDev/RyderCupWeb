// src/domain/value_objects/CompetitionId.test.js

import { describe, it, expect } from 'vitest';
import { CompetitionId } from './CompetitionId';

// A simple mock for v4 if needed, but 'uuid' package generates valid ones.
// We mostly care that it creates *something* that passes isValid.

describe('CompetitionId', () => {
  describe('Static methods', () => {
    it('generate() should create a valid and unique CompetitionId', () => {
      const id1 = CompetitionId.generate();
      const id2 = CompetitionId.generate();
      expect(id1).toBeInstanceOf(CompetitionId);
      expect(id1.value()).toBeTypeOf('string');
      expect(CompetitionId.isValid(id1.value())).toBe(true);
      expect(id1.equals(id2)).toBe(false); // Should be unique
    });

    it('isValid() should return true for valid UUID v4 strings', () => {
      const validUuid = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      expect(CompetitionId.isValid(validUuid)).toBe(true);
    });

    it('isValid() should return false for invalid UUID strings', () => {
      expect(CompetitionId.isValid('not-a-uuid')).toBe(false);
      expect(CompetitionId.isValid('a1b2c3d4-e5f6-7890-1234-567890abcde')).toBe(false); // Too short
      expect(CompetitionId.isValid('a1b2c3d4-e5f6-7890-1234-567890abcdefg')).toBe(false); // Too long
      expect(CompetitionId.isValid(null)).toBe(false);
      expect(CompetitionId.isValid(undefined)).toBe(false);
      expect(CompetitionId.isValid(123)).toBe(false);
    });
  });

  describe('Constructor', () => {
    it('should create a CompetitionId with a valid UUID string', () => {
      const validUuid = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      const id = new CompetitionId(validUuid);
      expect(id).toBeInstanceOf(CompetitionId);
      expect(id.value()).toBe(validUuid);
    });

    it('should throw an error for an invalid UUID string', () => {
      expect(() => new CompetitionId('not-a-uuid')).toThrow('Invalid CompetitionId: not-a-uuid');
    });
  });

  describe('equals', () => {
    it('should return true for two instances with the same UUID', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      const id1 = new CompetitionId(uuid);
      const id2 = new CompetitionId(uuid);
      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for two instances with different UUIDs', () => {
      const id1 = new CompetitionId('a1b2c3d4-e5f6-7890-1234-567890abcdef');
      const id2 = new CompetitionId('fedcba09-8765-4321-abcd-ef0123456789');
      expect(id1.equals(id2)).toBe(false);
    });

    it('should return false when comparing with null or a different object type', () => {
      const id = CompetitionId.generate();
      expect(id.equals(null)).toBe(false);
      expect(id.equals(undefined)).toBe(false);
      expect(id.equals('some-string')).toBe(false);
      expect(id.equals({ id: id.value() })).toBe(false);
    });
  });

  describe('value and toString', () => {
    it('should return the primitive string value', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      const id = new CompetitionId(uuid);
      expect(id.value()).toBe(uuid);
      expect(id.toString()).toBe(uuid);
    });
  });
});
