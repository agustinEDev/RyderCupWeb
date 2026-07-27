/**
 * Interface: IFriendRepository
 *
 * Defines the persistence contract for Friendships.
 *
 * Implementations:
 * - ApiFriendRepository (REST API)
 */
/* eslint-disable no-unused-vars */

class IFriendRepository {
  /**
   * Send a friend request to another user.
   *
   * @param {string} addresseeId - UUID of the user to add
   * @returns {Promise<Friendship>} Created friendship
   * @throws {Error} If operation fails
   */
  async sendRequest(addresseeId) {
    throw new Error('Method sendRequest() must be implemented');
  }

  /**
   * Respond to a friend request (accept or decline).
   *
   * @param {string} friendshipId - UUID of the friendship
   * @param {string} action - 'ACCEPT' or 'DECLINE'
   * @returns {Promise<Friendship>} Updated friendship
   * @throws {Error} If operation fails
   */
  async respondToRequest(friendshipId, action) {
    throw new Error('Method respondToRequest() must be implemented');
  }

  /**
   * Remove a friendship (unfriend, cancel a pending request, or unblock).
   *
   * @param {string} friendshipId - UUID of the friendship
   * @returns {Promise<void>}
   * @throws {Error} If operation fails
   */
  async removeFriend(friendshipId) {
    throw new Error('Method removeFriend() must be implemented');
  }

  /**
   * Block another user.
   *
   * @param {string} userId - UUID of the user to block
   * @returns {Promise<Friendship>} Resulting (blocked) friendship
   * @throws {Error} If operation fails
   */
  async blockUser(userId) {
    throw new Error('Method blockUser() must be implemented');
  }

  /**
   * Get the current user's accepted friends.
   *
   * @param {Object} filters - Optional filters (page, limit)
   * @returns {Promise<{friendships: Friendship[], totalCount: number}>}
   * @throws {Error} If operation fails
   */
  async getFriends(filters = {}) {
    throw new Error('Method getFriends() must be implemented');
  }

  /**
   * Get the current user's pending friend requests.
   *
   * @param {'received'|'sent'} direction
   * @param {Object} filters - Optional filters (page, limit)
   * @returns {Promise<{friendships: Friendship[], totalCount: number}>}
   * @throws {Error} If operation fails
   */
  async getPendingRequests(direction, filters = {}) {
    throw new Error('Method getPendingRequests() must be implemented');
  }
}

export default IFriendRepository;
