import Tee from '../value_objects/Tee';
import Hole from '../value_objects/Hole';

/**
 * GolfCourse Entity
 * Represents a golf course in the system
 */
class GolfCourse {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.countryCode = data.country_code || data.countryCode;
    this.courseType = data.course_type || data.courseType;
    this.creatorId = data.creator_id || data.creatorId;
    this.approvalStatus = data.approval_status || data.approvalStatus;
    this.rejectionReason = data.rejection_reason || data.rejectionReason || null;
    this.totalPar = data.total_par || data.totalPar;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;

    // New fields v2.0.0 (Sprint 1: Golf Course Management)
    this.originalGolfCourseId = data.original_golf_course_id || data.originalGolfCourseId || null;
    this.isPendingUpdate = data.is_pending_update || data.isPendingUpdate || false;

    // Value Objects
    this.tees = (data.tees || []).map(tee =>
      tee instanceof Tee ? tee : Tee.fromDTO(tee)
    );
    this.holes = (data.holes || []).map(hole =>
      hole instanceof Hole ? hole : Hole.fromDTO(hole)
    );
  }

  /**
   * Check if this golf course is a clone (update proposal)
   */
  isClone() {
    return this.originalGolfCourseId !== null;
  }

  /**
   * Check if this golf course has a pending update
   */
  hasPendingUpdate() {
    return this.isPendingUpdate === true;
  }

  /**
   * Check if the course is approved
   */
  isApproved() {
    return this.approvalStatus === 'APPROVED';
  }

  /**
   * Check if the course is pending approval
   */
  isPending() {
    return this.approvalStatus === 'PENDING_APPROVAL';
  }

  /**
   * Check if the course was rejected
   */
  isRejected() {
    return this.approvalStatus === 'REJECTED';
  }

  /**
   * Get the badge color based on approval status
   */
  getStatusColor() {
    switch (this.approvalStatus) {
      case 'APPROVED':
        return 'green';
      case 'PENDING_APPROVAL':
        return 'yellow';
      case 'REJECTED':
        return 'red';
      default:
        return 'gray';
    }
  }

  /**
   * Convert to DTO for API requests
   */
  toDTO() {
    return {
      id: this.id,
      name: this.name,
      country_code: this.countryCode,
      course_type: this.courseType,
      creator_id: this.creatorId,
      approval_status: this.approvalStatus,
      rejection_reason: this.rejectionReason,
      total_par: this.totalPar,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      original_golf_course_id: this.originalGolfCourseId,
      is_pending_update: this.isPendingUpdate,
      tees: this.tees.map(tee => tee.toDTO()),
      holes: this.holes.map(hole => hole.toDTO()),
    };
  }
}

export default GolfCourse;
