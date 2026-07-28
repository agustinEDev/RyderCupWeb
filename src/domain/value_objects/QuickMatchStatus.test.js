import { describe, it, expect } from 'vitest';
import QuickMatchStatus from './QuickMatchStatus';

describe('QuickMatchStatus', () => {
  describe('Constructor and basic properties', () => {
    it('should create a QuickMatchStatus with a valid state', () => {
      const status = new QuickMatchStatus('PENDING');
      expect(status).toBeInstanceOf(QuickMatchStatus);
      expect(status.toString()).toBe('PENDING');
    });

    it('should throw an error for an invalid state string', () => {
      expect(() => new QuickMatchStatus('INVALID_STATE')).toThrow('Invalid QuickMatchStatus: INVALID_STATE');
    });

    it('should have all 4 valid states', () => {
      const validStates = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      validStates.forEach((state) => {
        expect(() => new QuickMatchStatus(state)).not.toThrow();
      });
    });
  });

  describe('Factory methods', () => {
    it('should create each status via factory methods', () => {
      expect(QuickMatchStatus.pending().toString()).toBe('PENDING');
      expect(QuickMatchStatus.inProgress().toString()).toBe('IN_PROGRESS');
      expect(QuickMatchStatus.completed().toString()).toBe('COMPLETED');
      expect(QuickMatchStatus.cancelled().toString()).toBe('CANCELLED');
    });
  });

  describe('Query methods', () => {
    it('should correctly report isPending/isInProgress/isCompleted/isCancelled', () => {
      expect(QuickMatchStatus.pending().isPending()).toBe(true);
      expect(QuickMatchStatus.inProgress().isInProgress()).toBe(true);
      expect(QuickMatchStatus.completed().isCompleted()).toBe(true);
      expect(QuickMatchStatus.cancelled().isCancelled()).toBe(true);
      expect(QuickMatchStatus.pending().isInProgress()).toBe(false);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow PENDING -> IN_PROGRESS and PENDING -> CANCELLED', () => {
      const pending = QuickMatchStatus.pending();
      expect(pending.canTransitionTo(QuickMatchStatus.inProgress())).toBe(true);
      expect(pending.canTransitionTo(QuickMatchStatus.cancelled())).toBe(true);
      expect(pending.canTransitionTo(QuickMatchStatus.completed())).toBe(false);
    });

    it('should allow IN_PROGRESS -> COMPLETED and IN_PROGRESS -> CANCELLED', () => {
      const inProgress = QuickMatchStatus.inProgress();
      expect(inProgress.canTransitionTo(QuickMatchStatus.completed())).toBe(true);
      expect(inProgress.canTransitionTo(QuickMatchStatus.cancelled())).toBe(true);
      expect(inProgress.canTransitionTo(QuickMatchStatus.pending())).toBe(false);
    });

    it('should treat COMPLETED and CANCELLED as terminal', () => {
      expect(QuickMatchStatus.completed().canTransitionTo(QuickMatchStatus.pending())).toBe(false);
      expect(QuickMatchStatus.cancelled().canTransitionTo(QuickMatchStatus.pending())).toBe(false);
    });

    it('should throw if targetStatus is not a QuickMatchStatus instance', () => {
      expect(() => QuickMatchStatus.pending().canTransitionTo('IN_PROGRESS')).toThrow(TypeError);
    });
  });

  describe('equals', () => {
    it('should return true for the same status value', () => {
      expect(QuickMatchStatus.pending().equals(QuickMatchStatus.fromString('PENDING'))).toBe(true);
    });

    it('should return false for a different status value or non-VO', () => {
      expect(QuickMatchStatus.pending().equals(QuickMatchStatus.completed())).toBe(false);
      expect(QuickMatchStatus.pending().equals('PENDING')).toBe(false);
    });
  });
});
