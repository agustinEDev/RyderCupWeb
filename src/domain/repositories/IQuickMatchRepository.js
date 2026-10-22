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
   * Create the quick match with the wizard's whole draft and start it, in one
   * request (FE #848). Participants go in the order they were added; the id
   * comes from the client so a retry returns the same match.
   *
   * @param {Object} peticion - quickMatchId, golfCourseId, matchFormat, scoringFormat,
   *   name, allowancePercentage, playMode, creatorTeeColor, creatorTeeGender,
   *   creatorHandicap, participants (FRIEND | GUEST) and scorerUserIds
   * @returns {Promise<QuickMatch>} The started quick match
   * @throws {Error} If operation fails
   */
  async createAndStart(peticion) {
    throw new Error('Method createAndStart() must be implemented');
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
   * Hide the quick match from the current user's own history.
   *
   * Does not delete anything nor affect what other participants see: each
   * participant hides it only for themselves. Idempotent.
   *
   * @param {string} quickMatchId
   * @returns {Promise<QuickMatch>} Updated quick match
   * @throws {Error} If operation fails
   */
  async hide(quickMatchId) {
    throw new Error('Method hide() must be implemented');
  }

  /**
   * Leave the match out of the current user's statistics.
   *
   * Different from hide(): the match STAYS in their history, flagged, and the
   * flag can be lifted with includeInStats(). Per-user and idempotent. Only on
   * a finished match — the server answers 409 for anything else.
   *
   * @param {string} quickMatchId
   * @returns {Promise<QuickMatch>} Updated quick match
   * @throws {Error} If operation fails
   */
  async excludeFromStats(quickMatchId) {
    throw new Error('Method excludeFromStats() must be implemented');
  }

  /**
   * Count the match towards the current user's statistics again.
   *
   * Reverses excludeFromStats(). Idempotent, and allowed in any status.
   *
   * @param {string} quickMatchId
   * @returns {Promise<QuickMatch>} Updated quick match
   * @throws {Error} If operation fails
   */
  async includeInStats(quickMatchId) {
    throw new Error('Method includeInStats() must be implemented');
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
   * A finished quick match of someone else, read-only (K): the same detail as
   * `get`, without scoring. The API answers 403 if there is no access or the
   * match is still in progress, and 404 if it does not exist.
   *
   * @param {string} quickMatchId
   * @returns {Promise<{quickMatch: QuickMatch, readOnly: boolean, viewerIsParticipant: boolean}>}
   */
  async getShared(quickMatchId) {
    throw new Error('Method getShared() must be implemented');
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
