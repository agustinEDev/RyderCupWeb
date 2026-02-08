// src/domain/entities/GolfCourse.test.js

import { describe, it, expect, beforeEach } from 'vitest';
import GolfCourse from './GolfCourse';
import { Tee } from '../value_objects/Tee';
import { Hole } from '../value_objects/Hole';

describe('GolfCourse', () => {
  let validGolfCourseData;
  let validTees;
  let validHoles;

  beforeEach(() => {
    validTees = [
      new Tee({
        teeCategory: 'CHAMPIONSHIP',
        identifier: 'Black',
        courseRating: 75.5,
        slopeRating: 140,
        gender: 'MALE'
      }),
      new Tee({
        teeCategory: 'AMATEUR',
        identifier: 'Blue',
        courseRating: 72.0,
        slopeRating: 130,
        gender: 'MALE'
      })
    ];

    validHoles = [];
    for (let i = 1; i <= 18; i++) {
      validHoles.push(new Hole({
        holeNumber: i,
        par: i <= 4 || i === 9 || i === 14 || i === 18 ? 4 : (i === 2 || i === 7 || i === 11 || i === 16 ? 5 : 3),
        strokeIndex: i
      }));
    }

    validGolfCourseData = {
      id: 'golf-course-123',
      name: 'Pebble Beach Golf Links',
      country_code: 'US',
      course_type: 'STANDARD_18',
      creator_id: 'user-456',
      approval_status: 'APPROVED',
      rejection_reason: null,
      total_par: 72,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      original_golf_course_id: null,
      is_pending_update: false,
      tees: validTees,
      holes: validHoles
    };
  });

  describe('Constructor', () => {
    it('should create a GolfCourse instance with all properties', () => {
      const course = new GolfCourse(validGolfCourseData);

      expect(course).toBeInstanceOf(GolfCourse);
      expect(course.id).toBe('golf-course-123');
      expect(course.name).toBe('Pebble Beach Golf Links');
      expect(course.countryCode).toBe('US');
      expect(course.courseType).toBe('STANDARD_18');
      expect(course.creatorId).toBe('user-456');
      expect(course.approvalStatus).toBe('APPROVED');
      expect(course.rejectionReason).toBeNull();
      expect(course.totalPar).toBe(72);
      expect(course.originalGolfCourseId).toBeNull();
      expect(course.isPendingUpdate).toBe(false);
      expect(course.tees).toHaveLength(2);
      expect(course.holes).toHaveLength(18);
    });

    it('should handle camelCase property names', () => {
      const camelCaseData = {
        id: 'golf-course-123',
        name: 'Test Course',
        countryCode: 'ES',
        courseType: 'PITCH_AND_PUTT',
        creatorId: 'user-789',
        approvalStatus: 'PENDING_APPROVAL',
        totalPar: 54,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        originalGolfCourseId: null,
        isPendingUpdate: false,
        tees: validTees.slice(0, 1),
        holes: validHoles
      };

      const course = new GolfCourse(camelCaseData);

      expect(course.countryCode).toBe('ES');
      expect(course.courseType).toBe('PITCH_AND_PUTT');
      expect(course.creatorId).toBe('user-789');
      expect(course.approvalStatus).toBe('PENDING_APPROVAL');
      expect(course.totalPar).toBe(54);
    });

    it('should convert tee DTOs to Tee instances', () => {
      const dataWithTeeDTOs = {
        ...validGolfCourseData,
        tees: [
          {
            tee_category: 'AMATEUR',
            identifier: 'White',
            course_rating: 70.0,
            slope_rating: 120,
            tee_gender: 'MALE'
          }
        ]
      };

      const course = new GolfCourse(dataWithTeeDTOs);

      expect(course.tees[0]).toBeInstanceOf(Tee);
      expect(course.tees[0].teeCategory).toBe('AMATEUR');
    });

    it('should convert hole DTOs to Hole instances', () => {
      const dataWithHoleDTOs = {
        ...validGolfCourseData,
        holes: [
          { hole_number: 1, par: 4, stroke_index: 1 },
          { hole_number: 2, par: 5, stroke_index: 2 }
        ]
      };

      const course = new GolfCourse(dataWithHoleDTOs);

      expect(course.holes[0]).toBeInstanceOf(Hole);
      expect(course.holes[0].holeNumber).toBe(1);
      expect(course.holes[1]).toBeInstanceOf(Hole);
      expect(course.holes[1].par).toBe(5);
    });

    it('should handle empty tees array', () => {
      const dataWithoutTees = {
        ...validGolfCourseData,
        tees: []
      };

      const course = new GolfCourse(dataWithoutTees);

      expect(course.tees).toEqual([]);
    });

    it('should handle empty holes array', () => {
      const dataWithoutHoles = {
        ...validGolfCourseData,
        holes: []
      };

      const course = new GolfCourse(dataWithoutHoles);

      expect(course.holes).toEqual([]);
    });

    it('should set rejection_reason to null if not provided', () => {
      const dataWithoutRejectionReason = {
        ...validGolfCourseData,
        rejection_reason: undefined
      };

      const course = new GolfCourse(dataWithoutRejectionReason);

      expect(course.rejectionReason).toBeNull();
    });
  });

  describe('isClone', () => {
    it('should return false for original golf course', () => {
      const course = new GolfCourse(validGolfCourseData);

      expect(course.isClone()).toBe(false);
    });

    it('should return true for cloned golf course (update proposal)', () => {
      const cloneData = {
        ...validGolfCourseData,
        id: 'golf-course-clone-456',
        original_golf_course_id: 'golf-course-123',
        approval_status: 'PENDING_APPROVAL'
      };

      const course = new GolfCourse(cloneData);

      expect(course.isClone()).toBe(true);
    });
  });

  describe('hasPendingUpdate', () => {
    it('should return false when no pending update exists', () => {
      const course = new GolfCourse(validGolfCourseData);

      expect(course.hasPendingUpdate()).toBe(false);
    });

    it('should return true when pending update exists', () => {
      const dataWithPendingUpdate = {
        ...validGolfCourseData,
        is_pending_update: true
      };

      const course = new GolfCourse(dataWithPendingUpdate);

      expect(course.hasPendingUpdate()).toBe(true);
    });
  });

  describe('isApproved', () => {
    it('should return true for APPROVED status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'APPROVED'
      });

      expect(course.isApproved()).toBe(true);
    });

    it('should return false for PENDING_APPROVAL status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'PENDING_APPROVAL'
      });

      expect(course.isApproved()).toBe(false);
    });

    it('should return false for REJECTED status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'REJECTED'
      });

      expect(course.isApproved()).toBe(false);
    });
  });

  describe('isPending', () => {
    it('should return true for PENDING_APPROVAL status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'PENDING_APPROVAL'
      });

      expect(course.isPending()).toBe(true);
    });

    it('should return false for APPROVED status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'APPROVED'
      });

      expect(course.isPending()).toBe(false);
    });

    it('should return false for REJECTED status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'REJECTED'
      });

      expect(course.isPending()).toBe(false);
    });
  });

  describe('isRejected', () => {
    it('should return true for REJECTED status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'REJECTED',
        rejection_reason: 'Invalid course data'
      });

      expect(course.isRejected()).toBe(true);
    });

    it('should return false for APPROVED status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'APPROVED'
      });

      expect(course.isRejected()).toBe(false);
    });

    it('should return false for PENDING_APPROVAL status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'PENDING_APPROVAL'
      });

      expect(course.isRejected()).toBe(false);
    });
  });

  describe('getStatusColor', () => {
    it('should return green for APPROVED status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'APPROVED'
      });

      expect(course.getStatusColor()).toBe('green');
    });

    it('should return yellow for PENDING_APPROVAL status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'PENDING_APPROVAL'
      });

      expect(course.getStatusColor()).toBe('yellow');
    });

    it('should return red for REJECTED status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'REJECTED'
      });

      expect(course.getStatusColor()).toBe('red');
    });

    it('should return gray for unknown status', () => {
      const course = new GolfCourse({
        ...validGolfCourseData,
        approval_status: 'UNKNOWN_STATUS'
      });

      expect(course.getStatusColor()).toBe('gray');
    });
  });

  describe('toDTO', () => {
    it('should convert GolfCourse to DTO format with snake_case', () => {
      const course = new GolfCourse(validGolfCourseData);
      const dto = course.toDTO();

      expect(dto.id).toBe('golf-course-123');
      expect(dto.name).toBe('Pebble Beach Golf Links');
      expect(dto.country_code).toBe('US');
      expect(dto.course_type).toBe('STANDARD_18');
      expect(dto.creator_id).toBe('user-456');
      expect(dto.approval_status).toBe('APPROVED');
      expect(dto.rejection_reason).toBeNull();
      expect(dto.total_par).toBe(72);
      expect(dto.created_at).toBe('2024-01-01T00:00:00Z');
      expect(dto.updated_at).toBe('2024-01-01T00:00:00Z');
      expect(dto.original_golf_course_id).toBeNull();
      expect(dto.is_pending_update).toBe(false);
    });

    it('should convert tees to DTO format', () => {
      const course = new GolfCourse(validGolfCourseData);
      const dto = course.toDTO();

      expect(dto.tees).toHaveLength(2);
      expect(dto.tees[0]).toHaveProperty('tee_category');
      expect(dto.tees[0]).toHaveProperty('course_rating');
      expect(dto.tees[0]).toHaveProperty('slope_rating');
    });

    it('should convert holes to DTO format', () => {
      const course = new GolfCourse(validGolfCourseData);
      const dto = course.toDTO();

      expect(dto.holes).toHaveLength(18);
      expect(dto.holes[0]).toHaveProperty('hole_number');
      expect(dto.holes[0]).toHaveProperty('par');
      expect(dto.holes[0]).toHaveProperty('stroke_index');
    });

    it('should include rejection_reason when present', () => {
      const rejectedData = {
        ...validGolfCourseData,
        approval_status: 'REJECTED',
        rejection_reason: 'Course does not meet standards'
      };

      const course = new GolfCourse(rejectedData);
      const dto = course.toDTO();

      expect(dto.rejection_reason).toBe('Course does not meet standards');
    });

    it('should include original_golf_course_id for clones', () => {
      const cloneData = {
        ...validGolfCourseData,
        id: 'clone-456',
        original_golf_course_id: 'golf-course-123'
      };

      const course = new GolfCourse(cloneData);
      const dto = course.toDTO();

      expect(dto.original_golf_course_id).toBe('golf-course-123');
    });

    it('should set is_pending_update flag correctly', () => {
      const dataWithPending = {
        ...validGolfCourseData,
        is_pending_update: true
      };

      const course = new GolfCourse(dataWithPending);
      const dto = course.toDTO();

      expect(dto.is_pending_update).toBe(true);
    });
  });

  describe('Complete Workflow Scenarios', () => {
    it('should handle new course request workflow', () => {
      // User creates new course request
      const newRequest = new GolfCourse({
        id: 'pending-course-789',
        name: 'Augusta National',
        country_code: 'US',
        course_type: 'STANDARD_18',
        creator_id: 'user-123',
        approval_status: 'PENDING_APPROVAL',
        total_par: 72,
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
        original_golf_course_id: null,
        is_pending_update: false,
        tees: validTees,
        holes: validHoles
      });

      expect(newRequest.isPending()).toBe(true);
      expect(newRequest.isClone()).toBe(false);
      expect(newRequest.getStatusColor()).toBe('yellow');
    });

    it('should handle update proposal workflow', () => {
      // Creator proposes update to existing course
      const updateProposal = new GolfCourse({
        id: 'clone-999',
        name: 'Pebble Beach Golf Links (Updated)',
        country_code: 'US',
        course_type: 'STANDARD_18',
        creator_id: 'user-456',
        approval_status: 'PENDING_APPROVAL',
        total_par: 72,
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
        original_golf_course_id: 'golf-course-123',
        is_pending_update: false,
        tees: validTees,
        holes: validHoles
      });

      // Original course should show pending update flag
      const originalCourse = new GolfCourse({
        ...validGolfCourseData,
        is_pending_update: true
      });

      expect(updateProposal.isClone()).toBe(true);
      expect(updateProposal.isPending()).toBe(true);
      expect(originalCourse.hasPendingUpdate()).toBe(true);
    });

    it('should handle rejection workflow', () => {
      const rejectedCourse = new GolfCourse({
        id: 'rejected-course-111',
        name: 'Invalid Course',
        country_code: 'XX',
        course_type: 'STANDARD_18',
        creator_id: 'user-999',
        approval_status: 'REJECTED',
        rejection_reason: 'Invalid country code and incomplete hole data',
        total_par: 72,
        created_at: '2024-03-01T00:00:00Z',
        updated_at: '2024-03-05T00:00:00Z',
        original_golf_course_id: null,
        is_pending_update: false,
        tees: [],
        holes: []
      });

      expect(rejectedCourse.isRejected()).toBe(true);
      expect(rejectedCourse.rejectionReason).toBe('Invalid country code and incomplete hole data');
      expect(rejectedCourse.getStatusColor()).toBe('red');
    });
  });
});
