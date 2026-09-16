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
   * GET /api/v1/competitions/matches/{matchId}/scoring-view
   */
  async getScoringView(matchId) {
    const data = await apiRequest(`/api/v1/competitions/matches/${matchId}/scoring-view`);
    return ScoringMapper.toScoringViewDTO(data);
  }

  /**
   * POST /api/v1/competitions/matches/{matchId}/scores/holes/{holeNumber}
   */
  async submitHoleScore(matchId, holeNumber, scoreData) {
    // Un golpe que no viene NO llega al servidor, y eso importa: alli omitirlo
    // deja esa anotacion como estaba, mientras que `null` es una raya —conceder
    // el hoyo— (#609, RyderCupAm#301). Lo consigue `JSON.stringify`, que tira
    // las claves con valor `undefined`; es un mecanismo invisible al leer, asi
    // que queda dicho. Quien decide que se manda es el caso de uso
    const data = await apiRequest(`/api/v1/competitions/matches/${matchId}/scores/holes/${holeNumber}`, {
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
   * POST /api/v1/competitions/matches/{matchId}/scorecard/submit
   */
  async submitScorecard(matchId) {
    const data = await apiRequest(`/api/v1/competitions/matches/${matchId}/scorecard/submit`, {
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
   * PUT /api/v1/competitions/matches/{matchId}/concede
   */
  async concedeMatch(matchId, concedingTeam, reason) {
    const body = {
      conceding_team: concedingTeam,
    };
    if (reason) {
      body.reason = reason;
    }
    const data = await apiRequest(`/api/v1/competitions/matches/${matchId}/concede`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return data;
  }
}

export default ApiScoringRepository;
