import IQuickMatchRepository from '../../domain/repositories/IQuickMatchRepository';
import QuickMatchMapper from '../mappers/QuickMatchMapper';
import apiRequest from '../../services/api.js';

/**
 * ApiQuickMatchRepository - REST API implementation
 *
 * Endpoints:
 * - POST   /api/v1/quick-matches
 * - POST   /api/v1/quick-matches/{id}/participants
 * - POST   /api/v1/quick-matches/{id}/participants/guest
 * - DELETE /api/v1/quick-matches/{id}/participants/{participantId}
 * - PATCH  /api/v1/quick-matches/{id}/participants/{participantId}/handicap
 * - POST   /api/v1/quick-matches/{id}/start
 * - POST   /api/v1/quick-matches/{id}/complete
 * - POST   /api/v1/quick-matches/{id}/cancel
 * - POST   /api/v1/quick-matches/{id}/holes/{n}/score
 * - POST   /api/v1/quick-matches/{id}/participants/{participantId}/holes/{n}/score
 * - GET    /api/v1/quick-matches/{id}
 * - GET    /api/v1/quick-matches/me
 */
class ApiQuickMatchRepository extends IQuickMatchRepository {
  constructor() {
    super();
  }

  #buildQueryString(filters) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  async create(golfCourseId, matchFormat, scoringFormat, name = null, options = {}) {
    const {
      allowancePercentage = null,
      playMode = 'HANDICAP',
      creatorTeeColor = null,
      creatorTeeGender = null,
    } = options;
    const apiData = await apiRequest('/api/v1/quick-matches', {
      method: 'POST',
      body: JSON.stringify({
        golf_course_id: golfCourseId,
        match_format: matchFormat,
        scoring_format: scoringFormat,
        name,
        allowance_percentage: allowancePercentage,
        play_mode: playMode,
        creator_tee_color: creatorTeeColor,
        creator_tee_gender: creatorTeeGender,
      }),
    });

    return QuickMatchMapper.toDomain(apiData);
  }

  async addFriendParticipant(quickMatchId, friendUserId, team = null, options = {}) {
    const { color = null, teeGender = null } = options;
    const apiData = await apiRequest(`/api/v1/quick-matches/${quickMatchId}/participants`, {
      method: 'POST',
      body: JSON.stringify({
        friend_user_id: friendUserId,
        team,
        tee_color: color,
        tee_gender: teeGender,
      }),
    });

    return QuickMatchMapper.toDomain(apiData);
  }

  async addGuestParticipant(quickMatchId, guest) {
    const apiData = await apiRequest(`/api/v1/quick-matches/${quickMatchId}/participants/guest`, {
      method: 'POST',
      body: JSON.stringify({
        first_name: guest.firstName,
        last_name: guest.lastName,
        handicap: guest.handicap ?? null,
        team: guest.team ?? null,
        tee_color: guest.color ?? null,
        tee_gender: guest.teeGender ?? null,
      }),
    });

    return QuickMatchMapper.toDomain(apiData);
  }

  async removeParticipant(quickMatchId, participantId) {
    const apiData = await apiRequest(
      `/api/v1/quick-matches/${quickMatchId}/participants/${participantId}`,
      { method: 'DELETE' }
    );

    return QuickMatchMapper.toDomain(apiData);
  }

  async setParticipantHandicap(quickMatchId, participantId, handicap) {
    const apiData = await apiRequest(
      `/api/v1/quick-matches/${quickMatchId}/participants/${participantId}/handicap`,
      {
        method: 'PATCH',
        body: JSON.stringify({ handicap }),
      }
    );

    return QuickMatchMapper.toDomain(apiData);
  }

  async start(quickMatchId, scorerIds) {
    const apiData = await apiRequest(`/api/v1/quick-matches/${quickMatchId}/start`, {
      method: 'POST',
      body: JSON.stringify({ scorer_ids: scorerIds }),
    });

    return QuickMatchMapper.toDomain(apiData);
  }

  async complete(quickMatchId) {
    const apiData = await apiRequest(`/api/v1/quick-matches/${quickMatchId}/complete`, {
      method: 'POST',
    });

    return QuickMatchMapper.toDomain(apiData);
  }

  async cancel(quickMatchId) {
    const apiData = await apiRequest(`/api/v1/quick-matches/${quickMatchId}/cancel`, {
      method: 'POST',
    });

    return QuickMatchMapper.toDomain(apiData);
  }

  async hide(quickMatchId) {
    const apiData = await apiRequest(`/api/v1/quick-matches/${quickMatchId}/hide`, {
      method: 'POST',
    });

    return QuickMatchMapper.toDomain(apiData);
  }

  async submitHoleScore(quickMatchId, holeNumber, score) {
    return await apiRequest(`/api/v1/quick-matches/${quickMatchId}/holes/${holeNumber}/score`, {
      method: 'POST',
      body: JSON.stringify({ score }),
    });
  }

  async submitProxyHoleScore(quickMatchId, targetParticipantId, holeNumber, score) {
    return await apiRequest(
      `/api/v1/quick-matches/${quickMatchId}/participants/${targetParticipantId}/holes/${holeNumber}/score`,
      {
        method: 'POST',
        body: JSON.stringify({ score }),
      }
    );
  }

  async get(quickMatchId) {
    const apiData = await apiRequest(`/api/v1/quick-matches/${quickMatchId}`);
    return QuickMatchMapper.toDomain(apiData);
  }

  async listMine(filters = {}) {
    const apiFilters = {};
    if (filters.status) apiFilters.status = filters.status;
    if (filters.page) apiFilters.page = filters.page;
    if (filters.limit) apiFilters.limit = filters.limit;

    const queryString = this.#buildQueryString(apiFilters);
    const response = await apiRequest(`/api/v1/quick-matches/me${queryString}`);

    const apiDataArray = response.quick_matches || [];

    return {
      quickMatches: QuickMatchMapper.toDomainMany(apiDataArray),
      totalCount: response.total_count || 0,
      page: response.page || 1,
      limit: response.limit || 20,
    };
  }
}

export default ApiQuickMatchRepository;
