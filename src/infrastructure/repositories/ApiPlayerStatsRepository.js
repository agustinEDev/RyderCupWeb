import IPlayerStatsRepository from '../../domain/repositories/IPlayerStatsRepository';
import PlayerStatsMapper from '../mappers/PlayerStatsMapper';
import apiRequest from '../../services/api.js';

/**
 * ApiPlayerStatsRepository - REST API implementation
 *
 * Endpoints:
 * - GET /api/v1/users/me/stats
 */
class ApiPlayerStatsRepository extends IPlayerStatsRepository {
  constructor() {
    super();
  }

  async getPlayerStats() {
    const apiData = await apiRequest('/api/v1/users/me/stats');
    return PlayerStatsMapper.toDomain(apiData);
  }
}

export default ApiPlayerStatsRepository;
