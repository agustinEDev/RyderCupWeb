// src/domain/value_objects/EnrollmentId.test.js

import { describe, it, expect } from 'vitest';
import EnrollmentId from './EnrollmentId';

describe('EnrollmentId', () => {
  describe('Static factory methods', () => {
    it('create() should generate a valid and unique EnrollmentId', () => {
      const id1 = EnrollmentId.create();
      const id2 = EnrollmentId.create();

      expect(id1).toBeInstanceOf(EnrollmentId);
      expect(id1.toString()).toBeTypeOf('string');
      expect(id1.toString()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(id1.equals(id2)).toBe(false); // Should be unique
    });

    it('fromString() should create an EnrollmentId from a valid UUID', () => {
      const validUuid = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      const id = EnrollmentId.fromString(validUuid);

      expect(id).toBeInstanceOf(EnrollmentId);
      expect(id.toString()).toBe(validUuid);
    });

    it('fromString() should throw an error for invalid UUID strings', () => {
      expect(() => EnrollmentId.fromString('not-a-uuid')).toThrow('Invalid UUID format: not-a-uuid');
      expect(() => EnrollmentId.fromString('a1b2c3d4-e5f6-7890-1234-567890abcde')).toThrow(); // Too short
      expect(() => EnrollmentId.fromString('a1b2c3d4-e5f6-7890-1234-567890abcdefg')).toThrow(); // Too long
      expect(() => EnrollmentId.fromString(null)).toThrow();
      expect(() => EnrollmentId.fromString(undefined)).toThrow();
      expect(() => EnrollmentId.fromString(123)).toThrow();
    });
  });

  describe('Constructor', () => {
    it('should create an EnrollmentId with a valid UUID string', () => {
      const validUuid = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      const id = new EnrollmentId(validUuid);

      expect(id).toBeInstanceOf(EnrollmentId);
      expect(id.toString()).toBe(validUuid);
    });

    it('should throw an error for an invalid UUID string', () => {
      expect(() => new EnrollmentId('not-a-uuid')).toThrow('Invalid UUID format: not-a-uuid');
    });

    it('should be case-insensitive', () => {
      const upperUuid = 'A1B2C3D4-E5F6-7890-1234-567890ABCDEF';
      const lowerUuid = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

      const id1 = new EnrollmentId(upperUuid);
      const id2 = new EnrollmentId(lowerUuid);

      expect(id1.toString()).toBe(upperUuid);
      expect(id2.toString()).toBe(lowerUuid);
    });
  });

  describe('equals', () => {
    it('should return true for two instances with the same UUID', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      const id1 = new EnrollmentId(uuid);
      const id2 = new EnrollmentId(uuid);

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for two instances with different UUIDs', () => {
      const id1 = new EnrollmentId('a1b2c3d4-e5f6-7890-1234-567890abcdef');
      const id2 = new EnrollmentId('fedcba09-8765-4321-abcd-ef0123456789');

      expect(id1.equals(id2)).toBe(false);
    });

    it('should return false when comparing with null or different object type', () => {
      const id = EnrollmentId.create();

      expect(id.equals(null)).toBe(false);
      expect(id.equals(undefined)).toBe(false);
      expect(id.equals('some-string')).toBe(false);
      expect(id.equals({ id: id.toString() })).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the primitive string value', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      const id = new EnrollmentId(uuid);

      expect(id.toString()).toBe(uuid);
    });
  });

  describe('Value Object immutability', () => {
    it('should not allow modification of internal value', () => {
      const id = EnrollmentId.create();
      const originalValue = id.toString();

      // Attempt to modify (should have no effect due to private field)
      expect(() => {
        id.value = 'new-value';
      }).not.toThrow(); // Won't throw, but won't change the value either

      expect(id.toString()).toBe(originalValue);
    });
  });
});
