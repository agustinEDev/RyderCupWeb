// src/domain/repositories/IScoringRepository.js

/**
 * Interface for the Scoring repository (Live Scoring, Sprint 4).
 *
 * Defines operations for match scoring, scorecard submission,
 * leaderboard retrieval, and match concession.
 *
 * Implementations:
 * - ApiScoringRepository: REST API real
 * - MockScoringRepository: For tests
 */

/* eslint-disable no-unused-vars */

class IScoringRepository {
  /**
   * Gets the unified scoring view for a match (3 tabs: Input, Scorecard, Leaderboard).
   * @param {string} matchId
   * @returns {Promise<Object>} ScoringView DTO
   * @throws {Error} If the operation fails
   */
  async getScoringView(matchId) {
    throw new Error('Method not implemented');
  }

  /**
   * Submits a hole score (own + marked player's score).
   * @param {string} matchId
   * @param {number} holeNumber - 1-18
   * @param {Object} scoreData - { ownScore, markedPlayerId, markedScore }
   * @returns {Promise<Object>} Updated ScoringView DTO
   * @throws {Error} If the operation fails
   */
  async submitHoleScore(matchId, holeNumber, scoreData) {
    throw new Error('Method not implemented');
  }

  /**
   * Submits the player's scorecard (locks their scores).
   * @param {string} matchId
   * @returns {Promise<Object>} Match summary DTO with result and stats
   * @throws {Error} If the operation fails
   */
  async submitScorecard(matchId) {
    throw new Error('Method not implemented');
  }

  /**
   * Gets the competition leaderboard (public endpoint).
   * @param {string} competitionId
   * @returns {Promise<Object>} Leaderboard DTO
   * @throws {Error} If the operation fails
   */
  async getLeaderboard(competitionId) {
    throw new Error('Method not implemented');
  }

  /**
   * Concedes a match (team gives up).
   * @param {string} matchId
   * @param {string} concedingTeam - 'A' or 'B'
   * @param {string|null} reason - Optional reason
   * @returns {Promise<Object>} Updated match status
   * @throws {Error} If the operation fails
   */
  async concedeMatch(matchId, concedingTeam, reason) {
    throw new Error('Method not implemented');
  }
}

export default IScoringRepository;
