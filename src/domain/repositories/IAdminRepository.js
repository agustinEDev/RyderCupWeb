/* eslint-disable no-unused-vars */

/**
 * Admin Repository Interface
 * Defines the contract for admin panel data operations (users + platform stats)
 */
class IAdminRepository {
  /**
   * Get platform-wide statistics
   * @returns {Promise<Object>} { totalUsers, totalCompetitions, totalQuickMatches, totalGolfCoursesApproved, totalGolfCoursesPending }
   */
  async getStats() {
    throw new Error('Method not implemented: getStats');
  }

  /**
   * List users, paginated and optionally filtered
   * @param {Object} filters
   * @param {string} [filters.search] - Filter by name/email
   * @param {boolean} [filters.isAdmin] - Filter by role
   * @param {boolean} [filters.isActive] - Filter by active status
   * @param {boolean} [filters.emailVerified] - Filter by email verification
   * @param {number} [filters.limit=20]
   * @param {number} [filters.offset=0]
   * @returns {Promise<{users: Object[], totalCount: number, limit: number, offset: number}>}
   */
  async listUsers(filters = {}) {
    throw new Error('Method not implemented: listUsers');
  }

  /**
   * Update a user's data
   * @param {string} userId
   * @param {Object} data - Partial fields to update (firstName, lastName, email, handicap, countryCode, isAdmin)
   * @returns {Promise<Object>} Updated user summary
   */
  async updateUser(userId, data) {
    throw new Error('Method not implemented: updateUser');
  }

  /**
   * Activate or deactivate a user's account
   * @param {string} userId
   * @param {boolean} isActive
   * @returns {Promise<void>}
   */
  async setUserActive(userId, isActive) {
    throw new Error('Method not implemented: setUserActive');
  }

  /**
   * Permanently delete a user's account.
   * Rejects with a 409 error (error.status === 409) if the account has
   * activity (created tournaments/quick matches, requested golf courses,
   * or has recorded scores) - deactivate instead in that case.
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    throw new Error('Method not implemented: deleteUser');
  }
}

export default IAdminRepository;
