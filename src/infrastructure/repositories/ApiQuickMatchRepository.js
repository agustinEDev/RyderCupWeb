import IQuickMatchRepository from '../../domain/repositories/IQuickMatchRepository';
import QuickMatchMapper from '../mappers/QuickMatchMapper';
import apiRequest from '../../services/api.js';
import { TOPE_DE_ANOTAR_MS } from './topeDeAnotar';

/**
 * ApiQuickMatchRepository - REST API implementation
 *
 * Endpoints:
 * - POST   /api/v1/quick-matches/start
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

  /**
   * Crea la partida con todo el borrador del asistente y la inicia en una
   * sola petición (FE #848). Los jugadores van en el orden en que se añadieron.
   */
  async createAndStart(peticion) {
    const apiData = await apiRequest('/api/v1/quick-matches/start', {
      method: 'POST',
      body: JSON.stringify({
        quick_match_id: peticion.quickMatchId,
        golf_course_id: peticion.golfCourseId,
        match_format: peticion.matchFormat ?? null,
        scoring_format: peticion.scoringFormat ?? null,
        name: peticion.name ?? null,
        allowance_percentage: peticion.allowancePercentage ?? null,
        play_mode: peticion.playMode ?? 'HANDICAP',
        creator_tee_color: peticion.creatorTeeColor ?? null,
        creator_tee_gender: peticion.creatorTeeGender ?? null,
        creator_handicap: peticion.creatorHandicap ?? null,
        participants: (peticion.participants ?? []).map((p) =>
          p.kind === 'FRIEND'
            ? {
                kind: 'FRIEND',
                friend_user_id: p.friendUserId,
                handicap: p.handicap ?? null,
                team: p.team ?? null,
                tee_color: p.teeColor ?? null,
                tee_gender: p.teeGender ?? null,
              }
            : {
                kind: 'GUEST',
                first_name: p.firstName,
                last_name: p.lastName,
                handicap: p.handicap ?? null,
                team: p.team ?? null,
                tee_color: p.teeColor ?? null,
                tee_gender: p.teeGender ?? null,
              }
        ),
        scorer_user_ids: peticion.scorerUserIds,
      }),
    });

    return QuickMatchMapper.toDomain(apiData);
  }

  async complete(quickMatchId) {
    const apiData = await apiRequest(`/api/v1/quick-matches/${quickMatchId}/complete`, {
      method: 'POST',
      topeMs: TOPE_DE_ANOTAR_MS,
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

  // El ojo: la partida deja de contar en las estadísticas de quien llama, pero
  // sigue en su historial. Es otra marca distinta de `hide`, que sí la quita de
  // la lista y no tiene vuelta atrás desde la aplicación.
  async excludeFromStats(quickMatchId) {
    const apiData = await apiRequest(`/api/v1/quick-matches/${quickMatchId}/stats-exclusion`, {
      method: 'POST',
    });

    return QuickMatchMapper.toDomain(apiData);
  }

  async includeInStats(quickMatchId) {
    const apiData = await apiRequest(`/api/v1/quick-matches/${quickMatchId}/stats-exclusion`, {
      method: 'DELETE',
    });

    return QuickMatchMapper.toDomain(apiData);
  }

  async submitHoleScore(quickMatchId, holeNumber, score) {
    return await apiRequest(`/api/v1/quick-matches/${quickMatchId}/holes/${holeNumber}/score`, {
      method: 'POST',
      body: JSON.stringify({ score }),
      topeMs: TOPE_DE_ANOTAR_MS,
    });
  }

  async submitProxyHoleScore(quickMatchId, targetParticipantId, holeNumber, score) {
    return await apiRequest(
      `/api/v1/quick-matches/${quickMatchId}/participants/${targetParticipantId}/holes/${holeNumber}/score`,
      {
        method: 'POST',
        body: JSON.stringify({ score }),
        topeMs: TOPE_DE_ANOTAR_MS,
      }
    );
  }

  async get(quickMatchId) {
    const apiData = await apiRequest(`/api/v1/quick-matches/${quickMatchId}`, { topeMs: TOPE_DE_ANOTAR_MS });
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
