import { describe, it, expect } from 'vitest';
import { RoundStatus, RoundStatusEnum } from './RoundStatus';

describe('RoundStatus', () => {
  describe('Constructor', () => {
    it('should create RoundStatus for each valid value', () => {
      Object.values(RoundStatusEnum).forEach(val => {
        const rs = new RoundStatus(val);
        expect(rs.value).toBe(val);
      });
    });

    it('should throw for invalid value', () => {
      expect(() => new RoundStatus('INVALID')).toThrow('Invalid round status: INVALID');
    });

    it('should be frozen after construction', () => {
      expect(Object.isFrozen(new RoundStatus('SCHEDULED'))).toBe(true);
    });
  });

  describe('canTransitionTo', () => {
    it('PENDING_TEAMS -> PENDING_MATCHES', () => {
      expect(RoundStatus.PENDING_TEAMS.canTransitionTo(RoundStatus.PENDING_MATCHES)).toBe(true);
    });

    it('PENDING_TEAMS cannot go to SCHEDULED directly', () => {
      expect(RoundStatus.PENDING_TEAMS.canTransitionTo(RoundStatus.SCHEDULED)).toBe(false);
    });

    it('PENDING_MATCHES -> SCHEDULED', () => {
      expect(RoundStatus.PENDING_MATCHES.canTransitionTo(RoundStatus.SCHEDULED)).toBe(true);
    });

    it('SCHEDULED -> IN_PROGRESS', () => {
      expect(RoundStatus.SCHEDULED.canTransitionTo(RoundStatus.IN_PROGRESS)).toBe(true);
    });

    it('IN_PROGRESS -> COMPLETED', () => {
      expect(RoundStatus.IN_PROGRESS.canTransitionTo(RoundStatus.COMPLETED)).toBe(true);
    });

    it('COMPLETED cannot transition', () => {
      expect(RoundStatus.COMPLETED.canTransitionTo(RoundStatus.IN_PROGRESS)).toBe(false);
      expect(RoundStatus.COMPLETED.canTransitionTo(RoundStatus.PENDING_TEAMS)).toBe(false);
    });
  });

  describe('isFinal', () => {
    it('COMPLETED is final', () => {
      expect(RoundStatus.COMPLETED.isFinal()).toBe(true);
    });

    it('other statuses are not final', () => {
      expect(RoundStatus.PENDING_TEAMS.isFinal()).toBe(false);
      expect(RoundStatus.PENDING_MATCHES.isFinal()).toBe(false);
      expect(RoundStatus.SCHEDULED.isFinal()).toBe(false);
      expect(RoundStatus.IN_PROGRESS.isFinal()).toBe(false);
    });
  });

  describe('isEditable', () => {
    it('PENDING_TEAMS is editable', () => {
      expect(RoundStatus.PENDING_TEAMS.isEditable()).toBe(true);
    });

    it('PENDING_MATCHES is editable', () => {
      expect(RoundStatus.PENDING_MATCHES.isEditable()).toBe(true);
    });

    it('SCHEDULED is not editable', () => {
      expect(RoundStatus.SCHEDULED.isEditable()).toBe(false);
    });

    it('IN_PROGRESS is not editable', () => {
      expect(RoundStatus.IN_PROGRESS.isEditable()).toBe(false);
    });

    it('COMPLETED is not editable', () => {
      expect(RoundStatus.COMPLETED.isEditable()).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the value string', () => {
      expect(RoundStatus.PENDING_TEAMS.toString()).toBe('PENDING_TEAMS');
      expect(RoundStatus.COMPLETED.toString()).toBe('COMPLETED');
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      const a = new RoundStatus('SCHEDULED');
      expect(a.equals(RoundStatus.SCHEDULED)).toBe(true);
    });

    it('should return false for different values', () => {
      expect(RoundStatus.SCHEDULED.equals(RoundStatus.COMPLETED)).toBe(false);
    });

    it('should return false for non-RoundStatus', () => {
      expect(RoundStatus.SCHEDULED.equals(null)).toBe(false);
      expect(RoundStatus.SCHEDULED.equals({ value: 'SCHEDULED' })).toBe(false);
    });
  });

  describe('Static instances', () => {
    it('should have frozen class', () => {
      expect(Object.isFrozen(RoundStatus)).toBe(true);
    });
  });
});
