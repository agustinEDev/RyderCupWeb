// src/domain/value_objects/TeamAssignment.test.js

import { describe, it, expect } from 'vitest';
import { TeamAssignment, TeamAssignmentEnum } from './TeamAssignment';

describe('TeamAssignment', () => {
  describe('Constructor and Validation', () => {
    it('should create a TeamAssignment with a valid type', () => {
      const manual = new TeamAssignment(TeamAssignmentEnum.MANUAL);
      expect(manual).toBeInstanceOf(TeamAssignment);
      expect(manual.value()).toBe(TeamAssignmentEnum.MANUAL);

      const automatic = new TeamAssignment(TeamAssignmentEnum.AUTOMATIC);
      expect(automatic).toBeInstanceOf(TeamAssignment);
      expect(automatic.value()).toBe(TeamAssignmentEnum.AUTOMATIC);
    });

    it('should throw an error for an invalid TeamAssignment type', () => {
      expect(() => new TeamAssignment('INVALID_TYPE')).toThrow('Invalid TeamAssignment: INVALID_TYPE');
    });

    it('should have predefined static instances', () => {
      expect(TeamAssignment.MANUAL).toBeInstanceOf(TeamAssignment);
      expect(TeamAssignment.MANUAL.value()).toBe(TeamAssignmentEnum.MANUAL);
      expect(TeamAssignment.AUTOMATIC).toBeInstanceOf(TeamAssignment);
      expect(TeamAssignment.AUTOMATIC.value()).toBe(TeamAssignmentEnum.AUTOMATIC);
    });
  });

  describe('Helper Methods', () => {
    const manual = TeamAssignment.MANUAL;
    const automatic = TeamAssignment.AUTOMATIC;

    it('isManual() should return true for MANUAL type', () => {
      expect(manual.isManual()).toBe(true);
      expect(automatic.isManual()).toBe(false);
    });

    it('isAutomatic() should return true for AUTOMATIC type', () => {
      expect(automatic.isAutomatic()).toBe(true);
      expect(manual.isAutomatic()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for two instances with the same type', () => {
      const assign1 = new TeamAssignment(TeamAssignmentEnum.MANUAL);
      const assign2 = new TeamAssignment(TeamAssignmentEnum.MANUAL);
      expect(assign1.equals(assign2)).toBe(true);
      expect(TeamAssignment.MANUAL.equals(assign2)).toBe(true);
    });

    it('should return false for two instances with different types', () => {
      const assign1 = new TeamAssignment(TeamAssignmentEnum.MANUAL);
      const assign2 = new TeamAssignment(TeamAssignmentEnum.AUTOMATIC);
      expect(assign1.equals(assign2)).toBe(false);
    });

    it('should return false when comparing with null or a different object type', () => {
      const assign = TeamAssignment.MANUAL;
      expect(assign.equals(null)).toBe(false);
      expect(assign.equals(undefined)).toBe(false);
      expect(assign.equals('MANUAL')).toBe(false);
    });
  });

  describe('value and toString', () => {
    it('should return the string value of the type', () => {
      const manual = TeamAssignment.MANUAL;
      expect(manual.value()).toBe(TeamAssignmentEnum.MANUAL);
      expect(manual.toString()).toBe(TeamAssignmentEnum.MANUAL);
    });
  });
});
