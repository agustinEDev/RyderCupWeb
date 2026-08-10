import IPlayerStatsRepository from '../../domain/repositories/IPlayerStatsRepository';
import PlayerStatsMapper from '../mappers/PlayerStatsMapper';
import RecentMatchMapper from '../mappers/RecentMatchMapper';
import apiRequest from '../../services/api.js';

/**
 * ApiPlayerStatsRepository - REST API implementation
 *
 * Endpoints:
 * - GET /api/v1/users/me/stats
 * - GET /api/v1/users/me/matches
 * - GET /api/v1/users/me/stats/golf-courses/{id}
 */
class ApiPlayerStatsRepository extends IPlayerStatsRepository {
  constructor() {
    super();
  }

  async getPlayerStats() {
    const apiData = await apiRequest('/api/v1/users/me/stats');
    return PlayerStatsMapper.toDomain(apiData);
  }

  async getRecentMatches(limit) {
    const query = limit ? `?limit=${limit}` : '';
    const apiData = await apiRequest(`/api/v1/users/me/matches${query}`);
    return RecentMatchMapper.toDomainList(apiData?.matches);
  }

  async getPlayerStatsByGolfCourse(golfCourseId) {
    const apiData = await apiRequest(
      `/api/v1/users/me/stats/golf-courses/${encodeURIComponent(golfCourseId)}`
    );
    return PlayerStatsMapper.toDomain(apiData);
  }
}

export default ApiPlayerStatsRepository;
