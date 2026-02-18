import { describe, it, expect } from 'vitest';
import InvitationStatus from './InvitationStatus';

describe('InvitationStatus', () => {
  describe('Constructor and basic properties', () => {
    it('should create an InvitationStatus with a valid state', () => {
      const status = new InvitationStatus('PENDING');
      expect(status).toBeInstanceOf(InvitationStatus);
      expect(status.toString()).toBe('PENDING');
    });

    it('should throw an error for an invalid state string', () => {
      expect(() => new InvitationStatus('INVALID_STATE')).toThrow('Invalid InvitationStatus: INVALID_STATE');
    });

    it('should have all 4 valid states', () => {
      const validStates = ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'];
      validStates.forEach((state) => {
        expect(() => new InvitationStatus(state)).not.toThrow();
      });
    });
  });

  describe('Factory methods', () => {
    it('should create each status via factory methods', () => {
      expect(InvitationStatus.pending().toString()).toBe('PENDING');
      expect(InvitationStatus.accepted().toString()).toBe('ACCEPTED');
      expect(InvitationStatus.declined().toString()).toBe('DECLINED');
      expect(InvitationStatus.expired().toString()).toBe('EXPIRED');
    });
  });

  describe('fromString', () => {
    it('should create from valid string', () => {
      const status = InvitationStatus.fromString('ACCEPTED');
      expect(status).toBeInstanceOf(InvitationStatus);
      expect(status.toString()).toBe('ACCEPTED');
    });

    it('should throw for invalid string', () => {
      expect(() => InvitationStatus.fromString('INVALID')).toThrow('Invalid InvitationStatus: INVALID');
    });
  });

  describe('Transitions', () => {
    it('should allow PENDING -> ACCEPTED', () => {
      const pending = InvitationStatus.pending();
      expect(pending.canTransitionTo(InvitationStatus.accepted())).toBe(true);
    });

    it('should allow PENDING -> DECLINED', () => {
      const pending = InvitationStatus.pending();
      expect(pending.canTransitionTo(InvitationStatus.declined())).toBe(true);
    });

    it('should allow PENDING -> EXPIRED', () => {
      const pending = InvitationStatus.pending();
      expect(pending.canTransitionTo(InvitationStatus.expired())).toBe(true);
    });

    it('should NOT allow transitions from terminal states', () => {
      const accepted = InvitationStatus.accepted();
      const declined = InvitationStatus.declined();
      const expired = InvitationStatus.expired();

      expect(accepted.canTransitionTo(InvitationStatus.pending())).toBe(false);
      expect(declined.canTransitionTo(InvitationStatus.pending())).toBe(false);
      expect(expired.canTransitionTo(InvitationStatus.pending())).toBe(false);
    });

    it('should throw TypeError for non-InvitationStatus argument', () => {
      const pending = InvitationStatus.pending();
      expect(() => pending.canTransitionTo('ACCEPTED')).toThrow(TypeError);
    });

    it('validateTransition should throw for invalid transition', () => {
      const accepted = InvitationStatus.accepted();
      expect(() => accepted.validateTransition(InvitationStatus.pending())).toThrow('Invalid transition');
    });

    it('validateTransition should not throw for valid transition', () => {
      const pending = InvitationStatus.pending();
      expect(() => pending.validateTransition(InvitationStatus.accepted())).not.toThrow();
    });
  });

  describe('Query methods', () => {
    it('isPending returns true only for PENDING', () => {
      expect(InvitationStatus.pending().isPending()).toBe(true);
      expect(InvitationStatus.accepted().isPending()).toBe(false);
    });

    it('isAccepted returns true only for ACCEPTED', () => {
      expect(InvitationStatus.accepted().isAccepted()).toBe(true);
      expect(InvitationStatus.pending().isAccepted()).toBe(false);
    });

    it('isDeclined returns true only for DECLINED', () => {
      expect(InvitationStatus.declined().isDeclined()).toBe(true);
      expect(InvitationStatus.pending().isDeclined()).toBe(false);
    });

    it('isExpired returns true only for EXPIRED', () => {
      expect(InvitationStatus.expired().isExpired()).toBe(true);
      expect(InvitationStatus.pending().isExpired()).toBe(false);
    });

    it('isTerminal returns true for ACCEPTED, DECLINED, EXPIRED', () => {
      expect(InvitationStatus.pending().isTerminal()).toBe(false);
      expect(InvitationStatus.accepted().isTerminal()).toBe(true);
      expect(InvitationStatus.declined().isTerminal()).toBe(true);
      expect(InvitationStatus.expired().isTerminal()).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for same value', () => {
      const a = InvitationStatus.pending();
      const b = InvitationStatus.pending();
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different value', () => {
      expect(InvitationStatus.pending().equals(InvitationStatus.accepted())).toBe(false);
    });

    it('should return false for non-InvitationStatus', () => {
      expect(InvitationStatus.pending().equals('PENDING')).toBe(false);
    });
  });

  describe('Static helpers', () => {
    it('isValid should validate known statuses', () => {
      expect(InvitationStatus.isValid('PENDING')).toBe(true);
      expect(InvitationStatus.isValid('INVALID')).toBe(false);
    });

    it('getAllValues returns all 4 values', () => {
      expect(InvitationStatus.getAllValues()).toEqual(['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED']);
    });
  });
});
