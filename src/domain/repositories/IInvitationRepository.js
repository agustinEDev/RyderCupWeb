/**
 * Interface: IInvitationRepository
 *
 * Defines the persistence contract for Invitations.
 *
 * Implementations:
 * - ApiInvitationRepository (REST API)
 * - MockInvitationRepository (for tests)
 */
/* eslint-disable no-unused-vars */

class IInvitationRepository {
  /**
   * Send invitation to a user by their user ID
   *
   * @param {string} competitionId - UUID of the competition
   * @param {string} inviteeUserId - UUID of the user to invite
   * @param {string|null} personalMessage - Optional personal message (max 500 chars)
   * @returns {Promise<Invitation>} Created invitation
   * @throws {Error} If operation fails
   */
  async sendInvitation(competitionId, inviteeUserId, personalMessage) {
    throw new Error('Method sendInvitation() must be implemented');
  }

  /**
   * Send invitation to a user by email address
   *
   * @param {string} competitionId - UUID of the competition
   * @param {string} inviteeEmail - Email of the person to invite
   * @param {string|null} personalMessage - Optional personal message (max 500 chars)
   * @returns {Promise<Invitation>} Created invitation
   * @throws {Error} If operation fails
   */
  async sendInvitationByEmail(competitionId, inviteeEmail, personalMessage) {
    throw new Error('Method sendInvitationByEmail() must be implemented');
  }

  /**
   * Get invitations received by the current user
   *
   * @param {Object} filters - Optional filters
   * @param {string} filters.status - Filter by status (PENDING, ACCEPTED, DECLINED, EXPIRED)
   * @param {number} filters.page - Page number (1-indexed)
   * @param {number} filters.limit - Items per page
   * @returns {Promise<{invitations: Invitation[], totalCount: number}>}
   * @throws {Error} If operation fails
   */
  async getMyInvitations(filters = {}) {
    throw new Error('Method getMyInvitations() must be implemented');
  }

  /**
   * Respond to an invitation (accept or decline)
   *
   * @param {string} invitationId - UUID of the invitation
   * @param {string} action - 'ACCEPT' or 'DECLINE'
   * @returns {Promise<Invitation>} Updated invitation
   * @throws {Error} If operation fails
   */
  async respondToInvitation(invitationId, action) {
    throw new Error('Method respondToInvitation() must be implemented');
  }

  /**
   * Get invitations sent for a competition (creator view)
   *
   * @param {string} competitionId - UUID of the competition
   * @param {Object} filters - Optional filters
   * @param {string} filters.status - Filter by status
   * @param {number} filters.page - Page number
   * @param {number} filters.limit - Items per page
   * @returns {Promise<{invitations: Invitation[], totalCount: number}>}
   * @throws {Error} If operation fails
   */
  async getCompetitionInvitations(competitionId, filters = {}) {
    throw new Error('Method getCompetitionInvitations() must be implemented');
  }
}

export default IInvitationRepository;
