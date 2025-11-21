// src/domain/value_objects/CompetitionStatus.test.js

import { describe, it, expect } from 'vitest';
import { CompetitionStatus, CompetitionStatusEnum } from './CompetitionStatus';

describe('CompetitionStatus', () => {
  describe('Constructor and basic properties', () => {
    it('should create a CompetitionStatus with a valid state', () => {
      const status = new CompetitionStatus(CompetitionStatusEnum.DRAFT);
      expect(status).toBeInstanceOf(CompetitionStatus);
      expect(status.value).toBe(CompetitionStatusEnum.DRAFT);
    });

    it('should throw an error for an invalid state string', () => {
      expect(() => new CompetitionStatus('INVALID_STATE')).toThrow('Invalid competition status: INVALID_STATE');
    });

    it('should have predefined static instances', () => {
      expect(CompetitionStatus.DRAFT.value).toBe(CompetitionStatusEnum.DRAFT);
      expect(CompetitionStatus.ACTIVE.value).toBe(CompetitionStatusEnum.ACTIVE);
      expect(CompetitionStatus.COMPLETED.value).toBe(CompetitionStatusEnum.COMPLETED);
    });

    it('static instances should be immutable', () => {
      expect(() => {
        CompetitionStatus.DRAFT.value = 'NEW_VALUE';
      }).toThrow(); // Attempting to change frozen object
    });
  });

  describe('canTransitionTo', () => {
    it('should allow valid transitions', () => {
      expect(CompetitionStatus.DRAFT.canTransitionTo(CompetitionStatus.ACTIVE)).toBe(true);
      expect(CompetitionStatus.ACTIVE.canTransitionTo(CompetitionStatus.CLOSED)).toBe(true);
      expect(CompetitionStatus.CLOSED.canTransitionTo(CompetitionStatus.IN_PROGRESS)).toBe(true);
      expect(CompetitionStatus.IN_PROGRESS.canTransitionTo(CompetitionStatus.COMPLETED)).toBe(true);
      expect(CompetitionStatus.ACTIVE.canTransitionTo(CompetitionStatus.CANCELLED)).toBe(true);
    });

    it('should not allow invalid transitions', () => {
      expect(CompetitionStatus.ACTIVE.canTransitionTo(CompetitionStatus.DRAFT)).toBe(false);
      expect(CompetitionStatus.COMPLETED.canTransitionTo(CompetitionStatus.ACTIVE)).toBe(false);
      expect(CompetitionStatus.IN_PROGRESS.canTransitionTo(CompetitionStatus.DRAFT)).toBe(false);
    });

    it('should not allow transitions from final states', () => {
      expect(CompetitionStatus.COMPLETED.canTransitionTo(CompetitionStatus.ACTIVE)).toBe(false);
      expect(CompetitionStatus.CANCELLED.canTransitionTo(CompetitionStatus.ACTIVE)).toBe(false);
    });
  });

  describe('isFinal', () => {
    it('should return true for COMPLETED and CANCELLED states', () => {
      expect(CompetitionStatus.COMPLETED.isFinal()).toBe(true);
      expect(CompetitionStatus.CANCELLED.isFinal()).toBe(true);
    });

    it('should return false for non-final states', () => {
      expect(CompetitionStatus.DRAFT.isFinal()).toBe(false);
      expect(CompetitionStatus.ACTIVE.isFinal()).toBe(false);
      expect(CompetitionStatus.CLOSED.isFinal()).toBe(false);
      expect(CompetitionStatus.IN_PROGRESS.isFinal()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for two instances with the same value', () => {
      const status1 = new CompetitionStatus(CompetitionStatusEnum.DRAFT);
      const status2 = new CompetitionStatus(CompetitionStatusEnum.DRAFT);
      expect(status1.equals(status2)).toBe(true);
      expect(CompetitionStatus.DRAFT.equals(status2)).toBe(true);
    });

    it('should return false for two instances with different values', () => {
      const status1 = new CompetitionStatus(CompetitionStatusEnum.DRAFT);
      const status2 = new CompetitionStatus(CompetitionStatusEnum.ACTIVE);
      expect(status1.equals(status2)).toBe(false);
    });

    it('should return false when comparing with null or different object type', () => {
      const status = CompetitionStatus.DRAFT;
      expect(status.equals(null)).toBe(false);
      expect(status.equals(undefined)).toBe(false);
      expect(status.equals('DRAFT')).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value of the status', () => {
      const status = CompetitionStatus.ACTIVE;
      expect(status.toString()).toBe(CompetitionStatusEnum.ACTIVE);
    });
  });
});
