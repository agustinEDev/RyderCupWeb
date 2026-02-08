// src/domain/entities/Enrollment.test.js

import { describe, it, expect, beforeEach } from 'vitest';
import Enrollment from './Enrollment';
import EnrollmentId from '../value_objects/EnrollmentId';
import EnrollmentStatus from '../value_objects/EnrollmentStatus';

describe('Enrollment', () => {
  let mockEnrollmentId;
  let mockCompetitionId;
  let mockUserId;

  beforeEach(() => {
    mockEnrollmentId = EnrollmentId.create();
    mockCompetitionId = 'comp-123';
    mockUserId = 'user-456';
  });

  const createValidEnrollmentProps = (overrides = {}) => ({
    enrollmentId: mockEnrollmentId,
    competitionId: mockCompetitionId,
    userId: mockUserId,
    status: EnrollmentStatus.requested(),
    teamId: null,
    customHandicap: null,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-01T10:00:00Z'),
    ...overrides,
  });

  describe('Constructor and fromPersistence()', () => {
    it('should create an Enrollment instance with valid properties', () => {
      const props = createValidEnrollmentProps();
      const enrollment = new Enrollment(props);

      expect(enrollment).toBeInstanceOf(Enrollment);
      expect(enrollment.enrollmentId.equals(props.enrollmentId)).toBe(true);
      expect(enrollment.competitionId).toBe(props.competitionId);
      expect(enrollment.userId).toBe(props.userId);
      expect(enrollment.status.equals(props.status)).toBe(true);
      expect(enrollment.teamId).toBe(props.teamId);
      expect(enrollment.customHandicap).toBe(props.customHandicap);
      expect(enrollment.createdAt).toEqual(props.createdAt);
      expect(enrollment.updatedAt).toEqual(props.updatedAt);
    });

    it('fromPersistence() should reconstruct an Enrollment from persisted data', () => {
      const props = createValidEnrollmentProps({
        status: EnrollmentStatus.approved(),
        teamId: '1',
        customHandicap: 18.5,
      });

      const enrollment = Enrollment.fromPersistence(props);

      expect(enrollment).toBeInstanceOf(Enrollment);
      expect(enrollment.isApproved()).toBe(true);
      expect(enrollment.teamId).toBe('1');
      expect(enrollment.customHandicap).toBe(18.5);
    });

    it('should throw an error if enrollmentId is not an EnrollmentId instance', () => {
      const props = createValidEnrollmentProps({ enrollmentId: 'invalid-id' });

      expect(() => new Enrollment(props)).toThrow('enrollmentId must be an EnrollmentId instance');
    });

    it('should throw an error if status is not an EnrollmentStatus instance', () => {
      const props = createValidEnrollmentProps({ status: 'REQUESTED' });

      expect(() => new Enrollment(props)).toThrow('status must be an EnrollmentStatus instance');
    });

    it('should throw an error if competitionId is missing', () => {
      const props = createValidEnrollmentProps({ competitionId: null });

      expect(() => new Enrollment(props)).toThrow('competitionId must be a non-empty string');
    });

    it('should throw an error if userId is missing', () => {
      const props = createValidEnrollmentProps({ userId: null });

      expect(() => new Enrollment(props)).toThrow('userId must be a non-empty string');
    });
  });

  describe('Factory methods', () => {
    describe('request()', () => {
      it('should create an enrollment in REQUESTED status', () => {
        const enrollment = Enrollment.request({
          enrollmentId: mockEnrollmentId,
          competitionId: mockCompetitionId,
          userId: mockUserId,
        });

        expect(enrollment).toBeInstanceOf(Enrollment);
        expect(enrollment.status.toString()).toBe('REQUESTED');
        expect(enrollment.teamId).toBe(null);
        expect(enrollment.customHandicap).toBe(null);
        expect(enrollment.createdAt).toBeInstanceOf(Date);
        expect(enrollment.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('invite()', () => {
      it('should create an enrollment in INVITED status', () => {
        const enrollment = Enrollment.invite({
          enrollmentId: mockEnrollmentId,
          competitionId: mockCompetitionId,
          userId: mockUserId,
        });

        expect(enrollment).toBeInstanceOf(Enrollment);
        expect(enrollment.status.toString()).toBe('INVITED');
        expect(enrollment.teamId).toBe(null);
        expect(enrollment.customHandicap).toBe(null);
      });
    });

    describe('directEnroll()', () => {
      it('should create an enrollment in APPROVED status', () => {
        const enrollment = Enrollment.directEnroll({
          enrollmentId: mockEnrollmentId,
          competitionId: mockCompetitionId,
          userId: mockUserId,
        });

        expect(enrollment).toBeInstanceOf(Enrollment);
        expect(enrollment.status.toString()).toBe('APPROVED');
        expect(enrollment.teamId).toBe(null);
        expect(enrollment.customHandicap).toBe(null);
      });

      it('should create an enrollment with custom handicap', () => {
        const enrollment = Enrollment.directEnroll({
          enrollmentId: mockEnrollmentId,
          competitionId: mockCompetitionId,
          userId: mockUserId,
          customHandicap: 15.0,
        });

        expect(enrollment.status.toString()).toBe('APPROVED');
        expect(enrollment.customHandicap).toBe(15.0);
        expect(enrollment.teamId).toBe(null);
      });
    });
  });

  describe('State transitions - approve()', () => {
    it('should transition from REQUESTED to APPROVED', () => {
      const requested = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const approved = requested.approve();

      expect(approved).toBeInstanceOf(Enrollment);
      expect(approved.status.toString()).toBe('APPROVED');
      expect(approved.updatedAt.getTime()).toBeGreaterThanOrEqual(requested.updatedAt.getTime());
      expect(approved).not.toBe(requested); // Immutability check
    });

    it('should transition from INVITED to APPROVED', () => {
      const invited = Enrollment.invite({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const approved = invited.approve();

      expect(approved.status.toString()).toBe('APPROVED');
    });

    it('should approve without team assignment', () => {
      const requested = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const approved = requested.approve();

      expect(approved.status.toString()).toBe('APPROVED');
      expect(approved.teamId).toBe(null);
    });

    it('should throw an error for invalid transition to APPROVED', () => {
      const rejected = Enrollment.fromPersistence({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
        status: EnrollmentStatus.rejected(),
        teamId: null,
        customHandicap: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => rejected.approve()).toThrow('Invalid transition: REJECTED → APPROVED');
    });
  });

  describe('State transitions - reject()', () => {
    it('should transition from REQUESTED to REJECTED', () => {
      const requested = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const rejected = requested.reject();

      expect(rejected).toBeInstanceOf(Enrollment);
      expect(rejected.status.toString()).toBe('REJECTED');
      expect(rejected.updatedAt.getTime()).toBeGreaterThanOrEqual(requested.updatedAt.getTime());
      expect(rejected).not.toBe(requested); // Immutability check
    });

    it('should transition from INVITED to REJECTED', () => {
      const invited = Enrollment.invite({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const rejected = invited.reject();

      expect(rejected.status.toString()).toBe('REJECTED');
    });

    it('should throw an error for invalid transition to REJECTED', () => {
      const approved = Enrollment.directEnroll({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(() => approved.reject()).toThrow('Invalid transition: APPROVED → REJECTED');
    });
  });

  describe('State transitions - cancel()', () => {
    it('should transition from REQUESTED to CANCELLED', () => {
      const requested = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const cancelled = requested.cancel();

      expect(cancelled).toBeInstanceOf(Enrollment);
      expect(cancelled.status.toString()).toBe('CANCELLED');
      expect(cancelled.updatedAt.getTime()).toBeGreaterThanOrEqual(requested.updatedAt.getTime());
      expect(cancelled).not.toBe(requested); // Immutability check
    });

    it('should transition from INVITED to CANCELLED', () => {
      const invited = Enrollment.invite({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const cancelled = invited.cancel();

      expect(cancelled.status.toString()).toBe('CANCELLED');
    });

    it('should throw an error for invalid transition to CANCELLED', () => {
      const approved = Enrollment.directEnroll({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(() => approved.cancel()).toThrow('Invalid transition: APPROVED → CANCELLED');
    });
  });

  describe('State transitions - withdraw()', () => {
    it('should transition from APPROVED to WITHDRAWN', () => {
      const approved = Enrollment.directEnroll({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const withdrawn = approved.withdraw();

      expect(withdrawn).toBeInstanceOf(Enrollment);
      expect(withdrawn.status.toString()).toBe('WITHDRAWN');
      expect(withdrawn.updatedAt.getTime()).toBeGreaterThanOrEqual(approved.updatedAt.getTime());
      expect(withdrawn).not.toBe(approved); // Immutability check
    });

    it('should throw an error for invalid transition to WITHDRAWN', () => {
      const requested = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(() => requested.withdraw()).toThrow('Invalid transition: REQUESTED → WITHDRAWN');
    });
  });

  describe('setCustomHandicap()', () => {
    it('should set custom handicap on an enrollment', () => {
      const enrollment = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const updated = enrollment.setCustomHandicap(18.5);

      expect(updated).toBeInstanceOf(Enrollment);
      expect(updated.customHandicap).toBe(18.5);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(enrollment.updatedAt.getTime());
      expect(updated).not.toBe(enrollment); // Immutability check
    });

    it('should throw an error if customHandicap is not a number', () => {
      const enrollment = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(() => enrollment.setCustomHandicap('invalid')).toThrow('El handicap debe ser un número válido');
    });

    it('should throw an error if customHandicap is below minimum', () => {
      const enrollment = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(() => enrollment.setCustomHandicap(-11.0)).toThrow(
        'El hándicap personalizado debe estar entre -10 y 54'
      );
    });

    it('should throw an error if customHandicap is above maximum', () => {
      const enrollment = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(() => enrollment.setCustomHandicap(55.0)).toThrow(
        'El hándicap personalizado debe estar entre -10 y 54'
      );
    });

    it('should allow edge case handicaps (-10.0 and 54.0)', () => {
      const enrollment = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const withMin = enrollment.setCustomHandicap(-10.0);
      expect(withMin.customHandicap).toBe(-10.0);

      const withMax = enrollment.setCustomHandicap(54.0);
      expect(withMax.customHandicap).toBe(54.0);
    });
  });

  describe('assignToTeam()', () => {
    it('should assign an enrollment to a team', () => {
      const enrollment = Enrollment.directEnroll({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const assigned = enrollment.assignToTeam('1');

      expect(assigned).toBeInstanceOf(Enrollment);
      expect(assigned.teamId).toBe('1');
      expect(assigned.updatedAt.getTime()).toBeGreaterThanOrEqual(enrollment.updatedAt.getTime());
      expect(assigned).not.toBe(enrollment); // Immutability check
    });

    it('should throw an error if not approved', () => {
      const requested = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(() => requested.assignToTeam('1')).toThrow(
        'Solo se pueden asignar equipos a enrollments aprobados'
      );
    });

    it('should throw an error if teamId is empty', () => {
      const enrollment = Enrollment.directEnroll({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(() => enrollment.assignToTeam('')).toThrow('El ID del equipo no puede estar vacío');
      expect(() => enrollment.assignToTeam('  ')).toThrow('El ID del equipo no puede estar vacío');
    });
  });

  describe('Status checker methods', () => {
    it('isPending() should return true for REQUESTED and INVITED', () => {
      const requested = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const invited = Enrollment.invite({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(requested.isPending()).toBe(true);
      expect(invited.isPending()).toBe(true);
    });

    it('isApproved() should return true only for APPROVED', () => {
      const approved = Enrollment.directEnroll({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(approved.isApproved()).toBe(true);
    });

    it('isRejected() should return true only for REJECTED', () => {
      const requested = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const rejected = requested.reject();

      expect(rejected.isRejected()).toBe(true);
    });

    it('isCancelled() should return true only for CANCELLED', () => {
      const requested = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const cancelled = requested.cancel();

      expect(cancelled.isCancelled()).toBe(true);
    });

    it('isWithdrawn() should return true only for WITHDRAWN', () => {
      const approved = Enrollment.directEnroll({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const withdrawn = approved.withdraw();

      expect(withdrawn.isWithdrawn()).toBe(true);
    });

    it('hasCustomHandicap() should return true when custom handicap is set', () => {
      const enrollment = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(enrollment.hasCustomHandicap()).toBe(false);

      const withHandicap = enrollment.setCustomHandicap(20.0);

      expect(withHandicap.hasCustomHandicap()).toBe(true);
    });

    it('hasTeamAssigned() should return true when team is assigned', () => {
      const enrollment = Enrollment.directEnroll({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(enrollment.hasTeamAssigned()).toBe(false);

      const withTeam = enrollment.assignToTeam('1');

      expect(withTeam.hasTeamAssigned()).toBe(true);
    });

    it('isFinal() should return true for final states', () => {
      const requested = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const rejected = requested.reject();
      const cancelled = requested.cancel();

      const approved = Enrollment.directEnroll({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const withdrawn = approved.withdraw();

      // Final states should return true
      expect(rejected.status.isFinal()).toBe(true);
      expect(cancelled.status.isFinal()).toBe(true);
      expect(withdrawn.status.isFinal()).toBe(true);

      // Non-final states should return false
      expect(requested.status.isFinal()).toBe(false);
      expect(approved.status.isFinal()).toBe(false);
    });
  });

  describe('teeCategory field', () => {
    it('should default teeCategory to null', () => {
      const enrollment = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      expect(enrollment.teeCategory).toBeNull();
    });

    it('should accept teeCategory in constructor', () => {
      const enrollment = new Enrollment(createValidEnrollmentProps({
        teeCategory: 'AMATEUR',
      }));

      expect(enrollment.teeCategory).toBe('AMATEUR');
    });

    it('should include teeCategory in toPersistence()', () => {
      const enrollment = new Enrollment(createValidEnrollmentProps({
        teeCategory: 'SENIOR',
      }));

      const persisted = enrollment.toPersistence();
      expect(persisted.teeCategory).toBe('SENIOR');
    });

    it('should propagate teeCategory through approve()', () => {
      const enrollment = new Enrollment(createValidEnrollmentProps({
        teeCategory: 'CHAMPIONSHIP',
      }));

      const approved = enrollment.approve();
      expect(approved.teeCategory).toBe('CHAMPIONSHIP');
    });

    it('should propagate teeCategory through reject()', () => {
      const enrollment = new Enrollment(createValidEnrollmentProps({
        teeCategory: 'AMATEUR',
      }));

      const rejected = enrollment.reject();
      expect(rejected.teeCategory).toBe('AMATEUR');
    });

    it('should propagate teeCategory through cancel()', () => {
      const enrollment = new Enrollment(createValidEnrollmentProps({
        teeCategory: 'JUNIOR',
      }));

      const cancelled = enrollment.cancel();
      expect(cancelled.teeCategory).toBe('JUNIOR');
    });

    it('should propagate teeCategory through withdraw()', () => {
      const enrollment = new Enrollment(createValidEnrollmentProps({
        status: EnrollmentStatus.approved(),
        teeCategory: 'FORWARD',
      }));

      const withdrawn = enrollment.withdraw();
      expect(withdrawn.teeCategory).toBe('FORWARD');
    });

    it('should propagate teeCategory through assignToTeam()', () => {
      const enrollment = new Enrollment(createValidEnrollmentProps({
        status: EnrollmentStatus.approved(),
        teeCategory: 'SENIOR',
      }));

      const assigned = enrollment.assignToTeam('1');
      expect(assigned.teeCategory).toBe('SENIOR');
    });

    it('should propagate teeCategory through setCustomHandicap()', () => {
      const enrollment = new Enrollment(createValidEnrollmentProps({
        teeCategory: 'AMATEUR',
      }));

      const updated = enrollment.setCustomHandicap(18.0);
      expect(updated.teeCategory).toBe('AMATEUR');
    });

    it('should propagate teeCategory through removeCustomHandicap()', () => {
      const enrollment = new Enrollment(createValidEnrollmentProps({
        teeCategory: 'CHAMPIONSHIP',
        customHandicap: 15.0,
      }));

      const updated = enrollment.removeCustomHandicap();
      expect(updated.teeCategory).toBe('CHAMPIONSHIP');
    });
  });

  describe('Immutability', () => {
    it('should return new instances for all state changes', () => {
      const original = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const approved = original.approve();
      const withHandicap = original.setCustomHandicap(18.0);
      const cancelled = original.cancel();

      expect(original).not.toBe(approved);
      expect(original).not.toBe(withHandicap);
      expect(original).not.toBe(cancelled);

      // Original should remain unchanged
      expect(original.status.toString()).toBe('REQUESTED');
      expect(original.customHandicap).toBe(null);
    });

    it('getters should be read-only (private fields protected)', () => {
      const enrollment = Enrollment.request({
        enrollmentId: mockEnrollmentId,
        competitionId: mockCompetitionId,
        userId: mockUserId,
      });

      const originalStatus = enrollment.status.toString();
      const originalId = enrollment.enrollmentId.toString();

      // Getters are read-only (will throw error if you try to modify)
      expect(() => {
        enrollment.status = EnrollmentStatus.approved();
      }).toThrow();

      expect(() => {
        enrollment.enrollmentId = EnrollmentId.create();
      }).toThrow();

      // Values remain unchanged
      expect(enrollment.status.toString()).toBe(originalStatus);
      expect(enrollment.enrollmentId.toString()).toBe(originalId);
    });
  });
});
