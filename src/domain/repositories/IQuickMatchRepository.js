/**
 * Interface: IQuickMatchRepository
 *
 * Defines the persistence contract for QuickMatches.
 *
 * Implementations:
 * - ApiQuickMatchRepository (REST API)
 */
/* eslint-disable no-unused-vars */

class IQuickMatchRepository {
  /**
   * Create a quick match (current user becomes creator/first participant).
   * Exactly one of matchFormat/scoringFormat must be provided.
   *
   * @param {string} golfCourseId - UUID of an APPROVED golf course
   * @param {string|null} matchFormat - 'SINGLES' | 'FOURBALL' | 'FOURSOMES' (Ryder Cup match play), or null for free play
   * @param {string|null} scoringFormat - 'MEDAL' | 'STABLEFORD' (free play), or null for match play
   * @param {string|null} name - Optional free-text name to tell matches apart
   * @param {{allowancePercentage?: number|null, creatorTeeCategory?: string|null, creatorTeeGender?: string|null}} options
   * @returns {Promise<QuickMatch>} Created quick match
   * @throws {Error} If operation fails
   */
  async create(golfCourseId, matchFormat, scoringFormat, name = null, options = {}) {
    throw new Error('Method create() must be implemented');
  }

  /**
   * Add an accepted friend as a participant.
   *
   * @param {string} quickMatchId
   * @param {string} friendUserId
   * @param {'A'|'B'|null} team
   * @param {{teeCategory?: string|null, teeGender?: string|null}} options
   * @returns {Promise<QuickMatch>} Updated quick match
   * @throws {Error} If operation fails
   */
  async addFriendParticipant(quickMatchId, friendUserId, team = null, options = {}) {
    throw new Error('Method addFriendParticipant() must be implemented');
  }

  /**
   * Add a guest participant (no account) by hand.
   *
   * @param {string} quickMatchId
   * @param {{firstName: string, lastName: string, handicap: number|null, team: 'A'|'B'|null}} guest
   * @returns {Promise<QuickMatch>} Updated quick match
   * @throws {Error} If operation fails
   */
  async addGuestParticipant(quickMatchId, guest) {
    throw new Error('Method addGuestParticipant() must be implemented');
  }

  /**
   * Remove a participant (self-leave or creator kick).
   *
   * @param {string} quickMatchId
   * @param {string} participantId
   * @returns {Promise<QuickMatch>} Updated quick match
   * @throws {Error} If operation fails
   */
  async removeParticipant(quickMatchId, participantId) {
    throw new Error('Method removeParticipant() must be implemented');
  }

  /**
   * Start the quick match, choosing 1 to 4 scorers (creator always included).
   *
   * @param {string} quickMatchId
   * @param {string[]} scorerIds - Participant ids
   * @returns {Promise<QuickMatch>} Updated quick match
   * @throws {Error} If operation fails
   */
  async start(quickMatchId, scorerIds) {
    throw new Error('Method start() must be implemented');
  }

  /**
   * Mark the quick match as completed.
   *
   * @param {string} quickMatchId
   * @returns {Promise<QuickMatch>} Updated quick match
   * @throws {Error} If operation fails
   */
  async complete(quickMatchId) {
    throw new Error('Method complete() must be implemented');
  }

  /**
   * Cancel the quick match.
   *
   * @param {string} quickMatchId
   * @returns {Promise<QuickMatch>} Updated quick match
   * @throws {Error} If operation fails
   */
  async cancel(quickMatchId) {
    throw new Error('Method cancel() must be implemented');
  }

  /**
   * Submit/update the current user's own score for a hole (scorers only).
   *
   * @param {string} quickMatchId
   * @param {number} holeNumber - 1 to 18
   * @param {number} score - 1 to 15
   * @returns {Promise<Object>} Hole score result
   * @throws {Error} If operation fails
   */
  async submitHoleScore(quickMatchId, holeNumber, score) {
    throw new Error('Method submitHoleScore() must be implemented');
  }

  /**
   * Submit a hole score on behalf of another participant (delegated scoring).
   *
   * @param {string} quickMatchId
   * @param {string} targetParticipantId
   * @param {number} holeNumber - 1 to 18
   * @param {number} score - 1 to 15
   * @returns {Promise<Object>} Hole score result
   * @throws {Error} If operation fails
   */
  async submitProxyHoleScore(quickMatchId, targetParticipantId, holeNumber, score) {
    throw new Error('Method submitProxyHoleScore() must be implemented');
  }

  /**
   * Get quick match detail: participants, hole scores, standing, scoring assignments.
   *
   * @param {string} quickMatchId
   * @returns {Promise<QuickMatch>}
   * @throws {Error} If operation fails
   */
  async get(quickMatchId) {
    throw new Error('Method get() must be implemented');
  }

  /**
   * List quick matches the current user participates in.
   *
   * @param {Object} filters - Optional filters (status, page, limit)
   * @returns {Promise<{quickMatches: QuickMatch[], totalCount: number, page: number, limit: number}>}
   * @throws {Error} If operation fails
   */
  async listMine(filters = {}) {
    throw new Error('Method listMine() must be implemented');
  }
}

export default IQuickMatchRepository;
