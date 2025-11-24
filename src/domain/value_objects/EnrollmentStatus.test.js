// src/domain/value_objects/EnrollmentStatus.test.js

import { describe, it, expect } from 'vitest';
import EnrollmentStatus from './EnrollmentStatus';

describe('EnrollmentStatus', () => {
  describe('Constructor and basic properties', () => {
    it('should create an EnrollmentStatus with a valid state', () => {
      const status = new EnrollmentStatus('REQUESTED');

      expect(status).toBeInstanceOf(EnrollmentStatus);
      expect(status.toString()).toBe('REQUESTED');
    });

    it('should throw an error for an invalid state string', () => {
      expect(() => new EnrollmentStatus('INVALID_STATE')).toThrow('Invalid EnrollmentStatus: INVALID_STATE');
    });

    it('should have predefined static factory methods', () => {
      expect(EnrollmentStatus.requested()).toBeInstanceOf(EnrollmentStatus);
      expect(EnrollmentStatus.requested().toString()).toBe('REQUESTED');

      expect(EnrollmentStatus.invited()).toBeInstanceOf(EnrollmentStatus);
      expect(EnrollmentStatus.invited().toString()).toBe('INVITED');

      expect(EnrollmentStatus.approved()).toBeInstanceOf(EnrollmentStatus);
      expect(EnrollmentStatus.approved().toString()).toBe('APPROVED');

      expect(EnrollmentStatus.rejected()).toBeInstanceOf(EnrollmentStatus);
      expect(EnrollmentStatus.rejected().toString()).toBe('REJECTED');

      expect(EnrollmentStatus.cancelled()).toBeInstanceOf(EnrollmentStatus);
      expect(EnrollmentStatus.cancelled().toString()).toBe('CANCELLED');

      expect(EnrollmentStatus.withdrawn()).toBeInstanceOf(EnrollmentStatus);
      expect(EnrollmentStatus.withdrawn().toString()).toBe('WITHDRAWN');
    });

    it('should have all 6 valid states', () => {
      const validStates = ['REQUESTED', 'INVITED', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN'];

      validStates.forEach((state) => {
        expect(() => new EnrollmentStatus(state)).not.toThrow();
      });
    });
  });

  describe('fromString factory method', () => {
    it('should create an EnrollmentStatus from a valid string', () => {
      const status = EnrollmentStatus.fromString('REQUESTED');

      expect(status).toBeInstanceOf(EnrollmentStatus);
      expect(status.toString()).toBe('REQUESTED');
    });

    it('should throw an error for an invalid string', () => {
      expect(() => EnrollmentStatus.fromString('INVALID')).toThrow('Invalid EnrollmentStatus: INVALID');
    });
  });

  describe('State transition validation', () => {
    it('should allow REQUESTED → APPROVED', () => {
      const requested = EnrollmentStatus.requested();

      expect(requested.canTransitionTo(EnrollmentStatus.approved())).toBe(true);
    });

    it('should allow REQUESTED → REJECTED', () => {
      const requested = EnrollmentStatus.requested();

      expect(requested.canTransitionTo(EnrollmentStatus.rejected())).toBe(true);
    });

    it('should allow REQUESTED → CANCELLED', () => {
      const requested = EnrollmentStatus.requested();

      expect(requested.canTransitionTo(EnrollmentStatus.cancelled())).toBe(true);
    });

    it('should allow INVITED → APPROVED', () => {
      const invited = EnrollmentStatus.invited();

      expect(invited.canTransitionTo(EnrollmentStatus.approved())).toBe(true);
    });

    it('should allow INVITED → REJECTED', () => {
      const invited = EnrollmentStatus.invited();

      expect(invited.canTransitionTo(EnrollmentStatus.rejected())).toBe(true);
    });

    it('should allow INVITED → CANCELLED', () => {
      const invited = EnrollmentStatus.invited();

      expect(invited.canTransitionTo(EnrollmentStatus.cancelled())).toBe(true);
    });

    it('should allow APPROVED → WITHDRAWN', () => {
      const approved = EnrollmentStatus.approved();

      expect(approved.canTransitionTo(EnrollmentStatus.withdrawn())).toBe(true);
    });

    it('should NOT allow APPROVED → CANCELLED', () => {
      const approved = EnrollmentStatus.approved();

      expect(approved.canTransitionTo(EnrollmentStatus.cancelled())).toBe(false);
    });

    it('should NOT allow REQUESTED → WITHDRAWN', () => {
      const requested = EnrollmentStatus.requested();

      expect(requested.canTransitionTo(EnrollmentStatus.withdrawn())).toBe(false);
    });

    it('should NOT allow transitions from REJECTED (final state)', () => {
      const rejected = EnrollmentStatus.rejected();

      expect(rejected.canTransitionTo(EnrollmentStatus.approved())).toBe(false);
      expect(rejected.canTransitionTo(EnrollmentStatus.requested())).toBe(false);
      expect(rejected.canTransitionTo(EnrollmentStatus.withdrawn())).toBe(false);
    });

    it('should NOT allow transitions from CANCELLED (final state)', () => {
      const cancelled = EnrollmentStatus.cancelled();

      expect(cancelled.canTransitionTo(EnrollmentStatus.approved())).toBe(false);
      expect(cancelled.canTransitionTo(EnrollmentStatus.requested())).toBe(false);
      expect(cancelled.canTransitionTo(EnrollmentStatus.withdrawn())).toBe(false);
    });

    it('should NOT allow transitions from WITHDRAWN (final state)', () => {
      const withdrawn = EnrollmentStatus.withdrawn();

      expect(withdrawn.canTransitionTo(EnrollmentStatus.approved())).toBe(false);
      expect(withdrawn.canTransitionTo(EnrollmentStatus.requested())).toBe(false);
      expect(withdrawn.canTransitionTo(EnrollmentStatus.cancelled())).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('should not throw for valid transitions', () => {
      const requested = EnrollmentStatus.requested();

      expect(() => requested.validateTransition(EnrollmentStatus.approved())).not.toThrow();
      expect(() => requested.validateTransition(EnrollmentStatus.rejected())).not.toThrow();
      expect(() => requested.validateTransition(EnrollmentStatus.cancelled())).not.toThrow();
    });

    it('should throw for invalid transitions', () => {
      const approved = EnrollmentStatus.approved();

      expect(() => approved.validateTransition(EnrollmentStatus.cancelled())).toThrow(
        'Invalid transition: APPROVED → CANCELLED'
      );
    });

    it('should throw for transitions from final states', () => {
      const rejected = EnrollmentStatus.rejected();

      expect(() => rejected.validateTransition(EnrollmentStatus.approved())).toThrow(
        'Invalid transition: REJECTED → APPROVED'
      );
    });
  });

  describe('Status type checkers', () => {
    it('isPending() should return true for REQUESTED and INVITED', () => {
      expect(EnrollmentStatus.requested().isPending()).toBe(true);
      expect(EnrollmentStatus.invited().isPending()).toBe(true);

      expect(EnrollmentStatus.approved().isPending()).toBe(false);
      expect(EnrollmentStatus.rejected().isPending()).toBe(false);
      expect(EnrollmentStatus.cancelled().isPending()).toBe(false);
      expect(EnrollmentStatus.withdrawn().isPending()).toBe(false);
    });

    it('isActive() should return true only for APPROVED', () => {
      expect(EnrollmentStatus.approved().isActive()).toBe(true);

      expect(EnrollmentStatus.requested().isActive()).toBe(false);
      expect(EnrollmentStatus.invited().isActive()).toBe(false);
      expect(EnrollmentStatus.rejected().isActive()).toBe(false);
      expect(EnrollmentStatus.cancelled().isActive()).toBe(false);
      expect(EnrollmentStatus.withdrawn().isActive()).toBe(false);
    });

    it('isRejected() should return true only for REJECTED', () => {
      expect(EnrollmentStatus.rejected().isRejected()).toBe(true);

      expect(EnrollmentStatus.requested().isRejected()).toBe(false);
      expect(EnrollmentStatus.invited().isRejected()).toBe(false);
      expect(EnrollmentStatus.approved().isRejected()).toBe(false);
      expect(EnrollmentStatus.cancelled().isRejected()).toBe(false);
      expect(EnrollmentStatus.withdrawn().isRejected()).toBe(false);
    });

    it('isCancelled() should return true only for CANCELLED', () => {
      expect(EnrollmentStatus.cancelled().isCancelled()).toBe(true);

      expect(EnrollmentStatus.requested().isCancelled()).toBe(false);
      expect(EnrollmentStatus.invited().isCancelled()).toBe(false);
      expect(EnrollmentStatus.approved().isCancelled()).toBe(false);
      expect(EnrollmentStatus.rejected().isCancelled()).toBe(false);
      expect(EnrollmentStatus.withdrawn().isCancelled()).toBe(false);
    });

    it('isWithdrawn() should return true only for WITHDRAWN', () => {
      expect(EnrollmentStatus.withdrawn().isWithdrawn()).toBe(true);

      expect(EnrollmentStatus.requested().isWithdrawn()).toBe(false);
      expect(EnrollmentStatus.invited().isWithdrawn()).toBe(false);
      expect(EnrollmentStatus.approved().isWithdrawn()).toBe(false);
      expect(EnrollmentStatus.rejected().isWithdrawn()).toBe(false);
      expect(EnrollmentStatus.cancelled().isWithdrawn()).toBe(false);
    });

    it('isFinal() should return true for REJECTED, CANCELLED, WITHDRAWN', () => {
      expect(EnrollmentStatus.rejected().isFinal()).toBe(true);
      expect(EnrollmentStatus.cancelled().isFinal()).toBe(true);
      expect(EnrollmentStatus.withdrawn().isFinal()).toBe(true);

      expect(EnrollmentStatus.requested().isFinal()).toBe(false);
      expect(EnrollmentStatus.invited().isFinal()).toBe(false);
      expect(EnrollmentStatus.approved().isFinal()).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for two instances with the same value', () => {
      const status1 = EnrollmentStatus.requested();
      const status2 = EnrollmentStatus.requested();

      expect(status1.equals(status2)).toBe(true);
    });

    it('should return false for two instances with different values', () => {
      const status1 = EnrollmentStatus.requested();
      const status2 = EnrollmentStatus.approved();

      expect(status1.equals(status2)).toBe(false);
    });

    it('should return false when comparing with null or different object type', () => {
      const status = EnrollmentStatus.requested();

      expect(status.equals(null)).toBe(false);
      expect(status.equals(undefined)).toBe(false);
      expect(status.equals('REQUESTED')).toBe(false);
      expect(status.equals({ value: 'REQUESTED' })).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the string value of the status', () => {
      expect(EnrollmentStatus.requested().toString()).toBe('REQUESTED');
      expect(EnrollmentStatus.invited().toString()).toBe('INVITED');
      expect(EnrollmentStatus.approved().toString()).toBe('APPROVED');
      expect(EnrollmentStatus.rejected().toString()).toBe('REJECTED');
      expect(EnrollmentStatus.cancelled().toString()).toBe('CANCELLED');
      expect(EnrollmentStatus.withdrawn().toString()).toBe('WITHDRAWN');
    });
  });

  describe('Value Object immutability', () => {
    it('should not allow modification of internal value', () => {
      const status = EnrollmentStatus.requested();
      const originalValue = status.toString();

      // Attempt to modify (should have no effect due to private field)
      expect(() => {
        status.value = 'APPROVED';
      }).not.toThrow(); // Won't throw, but won't change the value either

      expect(status.toString()).toBe(originalValue);
    });
  });
});
