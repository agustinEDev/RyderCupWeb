/* eslint-disable no-unused-vars */

/**
 * Golf Course Repository Interface
 * Defines the contract for golf course data operations
 */
class IGolfCourseRepository {
  /**
   * List all golf courses (with optional filtering)
   * @param {Object} filters - Optional filters
   * @param {string} filters.approvalStatus - Filter by approval status (APPROVED, PENDING_APPROVAL, REJECTED)
   * @returns {Promise<GolfCourse[]>} Array of golf courses
   */
  async list(filters = {}) {
    throw new Error('Method not implemented: list');
  }

  /**
   * Get a golf course by ID
   * @param {string} id - Golf course ID
   * @returns {Promise<GolfCourse>} Golf course entity
   */
  async getById(id) {
    throw new Error('Method not implemented: getById');
  }

  /**
   * Create a new golf course request (any user)
   * Creates a golf course in PENDING_APPROVAL status
   * @param {Object} golfCourseData - Golf course data
   * @returns {Promise<GolfCourse>} Created golf course
   */
  async create(golfCourseData) {
    throw new Error('Method not implemented: create');
  }

  /**
   * Create a golf course directly as APPROVED (admin only)
   * @param {Object} golfCourseData - Golf course data
   * @returns {Promise<GolfCourse>} Created golf course
   */
  async createAsAdmin(golfCourseData) {
    throw new Error('Method not implemented: createAsAdmin');
  }

  /**
   * Update a golf course
   * Workflow:
   * - Admin: updates in-place
   * - Creator editing APPROVED: creates clone
   * - Creator editing PENDING: updates in-place
   * @param {string} id - Golf course ID
   * @param {Object} golfCourseData - Updated golf course data
   * @returns {Promise<{golfCourse: GolfCourse, pendingUpdate: GolfCourse|null}>}
   */
  async update(id, golfCourseData) {
    throw new Error('Method not implemented: update');
  }

  /**
   * Approve a golf course (admin only)
   * Changes status from PENDING_APPROVAL to APPROVED
   * @param {string} id - Golf course ID
   * @returns {Promise<GolfCourse>} Approved golf course
   */
  async approve(id) {
    throw new Error('Method not implemented: approve');
  }

  /**
   * Reject a golf course (admin only)
   * Changes status from PENDING_APPROVAL to REJECTED
   * @param {string} id - Golf course ID
   * @param {string} reason - Rejection reason (10-500 chars)
   * @returns {Promise<GolfCourse>} Rejected golf course
   */
  async reject(id, reason) {
    throw new Error('Method not implemented: reject');
  }

  /**
   * Approve a golf course update (admin only)
   * Applies clone changes to original and deletes clone
   * @param {string} cloneId - Clone golf course ID
   * @returns {Promise<GolfCourse>} Updated original golf course
   */
  async approveUpdate(cloneId) {
    throw new Error('Method not implemented: approveUpdate');
  }

  /**
   * Reject a golf course update (admin only)
   * Deletes clone and leaves original unchanged
   * @param {string} cloneId - Clone golf course ID
   * @returns {Promise<GolfCourse>} Original golf course
   */
  async rejectUpdate(cloneId) {
    throw new Error('Method not implemented: rejectUpdate');
  }

  /**
   * List pending golf courses (admin only)
   * Returns courses with PENDING_APPROVAL status
   * @returns {Promise<GolfCourse[]>} Array of pending golf courses
   */
  async listPending() {
    throw new Error('Method not implemented: listPending');
  }
}

export default IGolfCourseRepository;
