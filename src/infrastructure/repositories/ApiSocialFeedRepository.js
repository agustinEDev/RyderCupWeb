import ISocialFeedRepository from '../../domain/repositories/ISocialFeedRepository';
import ActivityEventMapper from '../mappers/ActivityEventMapper';
import PlayerStatsMapper from '../mappers/PlayerStatsMapper';
import apiRequest from '../../services/api.js';

/**
 * ApiSocialFeedRepository - REST API implementation
 *
 * Endpoints:
 * - GET /api/v1/users/me/feed
 * - PUT /api/v1/users/me/feed/seen
 * - GET /api/v1/users/{id}/profile
 * - GET /api/v1/users/{id}/activity
 */
class ApiSocialFeedRepository extends ISocialFeedRepository {
  #buildQuery({ limit, cursor }) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (cursor) params.append('cursor', cursor);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  async getFeed({ limit = 20, cursor = null } = {}) {
    const data = await apiRequest(`/api/v1/users/me/feed${this.#buildQuery({ limit, cursor })}`);
    return ActivityEventMapper.feedToDomain(data);
  }

  async markFeedAsSeen() {
    await apiRequest('/api/v1/users/me/feed/seen', { method: 'PUT' });
  }

  async getPlayerProfile(userId) {
    const data = await apiRequest(`/api/v1/users/${userId}/profile`);

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      avatarSource: data.avatar_source,
      avatarPresetId: data.avatar_preset_id,
      hasAvatarUpload: data.has_avatar_upload,
      friendsCount: data.friends_count ?? 0,
      isFriend: data.is_friend ?? false,
      friendship: {
        status: data.friendship?.status ?? 'NONE',
        friendshipId: data.friendship?.friendship_id ?? null,
      },
      // Estos llegan en null cuando no sois amigos. Se dejan en null y no se
      // convierten a 0: un cero se leería como "juega fatal" en vez de "esto no
      // se puede ver".
      email: data.email ?? null,
      handicap: data.handicap ?? null,
      // Las estadísticas pasan por el mismo mapper que las propias: es el
      // mismo DTO del backend, y devolverlo aquí en snake_case obligaría a la
      // pantalla de perfil a leer los campos de otra forma que el resto del
      // frontend.
      stats: data.stats ? PlayerStatsMapper.toDomain(data.stats) : null,
    };
  }

  async getPlayerActivity(userId, { limit = 20, cursor = null } = {}) {
    const data = await apiRequest(
      `/api/v1/users/${userId}/activity${this.#buildQuery({ limit, cursor })}`
    );
    return ActivityEventMapper.feedToDomain(data);
  }
}

export default ApiSocialFeedRepository;
