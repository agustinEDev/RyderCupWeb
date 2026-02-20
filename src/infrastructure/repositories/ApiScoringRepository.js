// src/infrastructure/repositories/ApiScoringRepository.js

import apiRequest from '../../services/api.js';
import IScoringRepository from '../../domain/repositories/IScoringRepository.js';
import ScoringMapper from '../mappers/ScoringMapper';

/**
 * REST implementation of IScoringRepository.
 * Consumes the 4 new endpoints + 1 existing endpoint (concede action)
 * from Sprint 4.
 */
class ApiScoringRepository extends IScoringRepository {
  /**
   * GET /api/v1/matches/{matchId}/scoring-view
   */
  async getScoringView(matchId) {
    const data = await apiRequest(`/api/v1/matches/${matchId}/scoring-view`);
    return ScoringMapper.toScoringViewDTO(data);
  }

  /**
   * POST /api/v1/matches/{matchId}/scores/holes/{holeNumber}
   */
  async submitHoleScore(matchId, holeNumber, scoreData) {
    const data = await apiRequest(`/api/v1/matches/${matchId}/scores/holes/${holeNumber}`, {
      method: 'POST',
      body: JSON.stringify({
        own_score: scoreData.ownScore,
        marked_player_id: scoreData.markedPlayerId,
        marked_score: scoreData.markedScore,
      }),
    });
    return ScoringMapper.toScoringViewDTO(data);
  }

  /**
   * POST /api/v1/matches/{matchId}/scorecard/submit
   */
  async submitScorecard(matchId) {
    const data = await apiRequest(`/api/v1/matches/${matchId}/scorecard/submit`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return ScoringMapper.toMatchSummaryDTO(data);
  }

  /**
   * GET /api/v1/competitions/{competitionId}/leaderboard
   */
  async getLeaderboard(competitionId) {
    const data = await apiRequest(`/api/v1/competitions/${competitionId}/leaderboard`);
    return ScoringMapper.toLeaderboardDTO(data);
  }

  /**
   * PUT /api/v1/matches/{matchId}/status (action: concede)
   * Reuses the existing match status endpoint with a new action.
   */
  async concedeMatch(matchId, concedingTeam, reason) {
    const body = {
      action: 'concede',
      conceding_team: concedingTeam,
    };
    if (reason) {
      body.reason = reason;
    }
    const data = await apiRequest(`/api/v1/matches/${matchId}/status`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return data;
  }
}

export default ApiScoringRepository;
