import { describe, it, expect } from 'vitest';
import { MatchStatus, MatchStatusEnum } from './MatchStatus';

describe('MatchStatus', () => {
  describe('Constructor', () => {
    it('should create MatchStatus for each valid value', () => {
      Object.values(MatchStatusEnum).forEach(val => {
        const ms = new MatchStatus(val);
        expect(ms.value).toBe(val);
      });
    });

    it('should throw for invalid value', () => {
      expect(() => new MatchStatus('PAUSED')).toThrow('Invalid match status: PAUSED');
    });

    it('should be frozen after construction', () => {
      expect(Object.isFrozen(new MatchStatus('SCHEDULED'))).toBe(true);
    });
  });

  describe('canTransitionTo', () => {
    it('SCHEDULED -> IN_PROGRESS', () => {
      expect(MatchStatus.SCHEDULED.canTransitionTo(MatchStatus.IN_PROGRESS)).toBe(true);
    });

    it('SCHEDULED -> WALKOVER', () => {
      expect(MatchStatus.SCHEDULED.canTransitionTo(MatchStatus.WALKOVER)).toBe(true);
    });

    it('SCHEDULED cannot go to COMPLETED directly', () => {
      expect(MatchStatus.SCHEDULED.canTransitionTo(MatchStatus.COMPLETED)).toBe(false);
    });

    it('IN_PROGRESS -> COMPLETED', () => {
      expect(MatchStatus.IN_PROGRESS.canTransitionTo(MatchStatus.COMPLETED)).toBe(true);
    });

    it('IN_PROGRESS -> WALKOVER', () => {
      expect(MatchStatus.IN_PROGRESS.canTransitionTo(MatchStatus.WALKOVER)).toBe(true);
    });

    it('COMPLETED cannot transition', () => {
      expect(MatchStatus.COMPLETED.canTransitionTo(MatchStatus.IN_PROGRESS)).toBe(false);
      expect(MatchStatus.COMPLETED.canTransitionTo(MatchStatus.SCHEDULED)).toBe(false);
    });

    it('WALKOVER cannot transition', () => {
      expect(MatchStatus.WALKOVER.canTransitionTo(MatchStatus.IN_PROGRESS)).toBe(false);
      expect(MatchStatus.WALKOVER.canTransitionTo(MatchStatus.COMPLETED)).toBe(false);
    });
  });

  describe('isFinal', () => {
    it('COMPLETED is final', () => {
      expect(MatchStatus.COMPLETED.isFinal()).toBe(true);
    });

    it('WALKOVER is final', () => {
      expect(MatchStatus.WALKOVER.isFinal()).toBe(true);
    });

    it('SCHEDULED is not final', () => {
      expect(MatchStatus.SCHEDULED.isFinal()).toBe(false);
    });

    it('IN_PROGRESS is not final', () => {
      expect(MatchStatus.IN_PROGRESS.isFinal()).toBe(false);
    });
  });

  describe('isPlayable', () => {
    it('SCHEDULED is playable', () => {
      expect(MatchStatus.SCHEDULED.isPlayable()).toBe(true);
    });

    it('IN_PROGRESS is playable', () => {
      expect(MatchStatus.IN_PROGRESS.isPlayable()).toBe(true);
    });

    it('COMPLETED is not playable', () => {
      expect(MatchStatus.COMPLETED.isPlayable()).toBe(false);
    });

    it('WALKOVER is not playable', () => {
      expect(MatchStatus.WALKOVER.isPlayable()).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value string', () => {
      expect(MatchStatus.SCHEDULED.toString()).toBe('SCHEDULED');
      expect(MatchStatus.WALKOVER.toString()).toBe('WALKOVER');
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      const a = new MatchStatus('COMPLETED');
      expect(a.equals(MatchStatus.COMPLETED)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(MatchStatus.SCHEDULED.equals(MatchStatus.COMPLETED)).toBe(false);
    });

    it('should return false for non-MatchStatus', () => {
      expect(MatchStatus.SCHEDULED.equals(null)).toBe(false);
      expect(MatchStatus.SCHEDULED.equals({ value: 'SCHEDULED' })).toBe(false);
    });
  });

  describe('Static instances', () => {
    it('should have frozen class', () => {
      expect(Object.isFrozen(MatchStatus)).toBe(true);
    });
  });
});
