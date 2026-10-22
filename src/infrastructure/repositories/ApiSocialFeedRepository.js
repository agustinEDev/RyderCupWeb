import ISocialFeedRepository from '../../domain/repositories/ISocialFeedRepository';
import ActivityEventMapper from '../mappers/ActivityEventMapper';
import PlayerStatsMapper from '../mappers/PlayerStatsMapper';
import apiRequest from '../../services/api.js';

/**
 * ApiSocialFeedRepository - REST API implementation
 *
 * Endpoints:
 * - GET /api/v1/users/me/feed
 * - GET /api/v1/users/me/feed/unseen-count
 * - PUT /api/v1/users/me/feed/seen
 * - GET /api/v1/users/{id}/profile
 * - GET /api/v1/users/{id}/activity
 * - GET /api/v1/users/{id}/games-together
 * - PUT /api/v1/social/activity-sharing
 */
const balanceDe = (r) => (r ? { won: r.won ?? 0, halved: r.halved ?? 0, lost: r.lost ?? 0 } : null);

const partidaJuntos = (g) => ({
  kind: g.kind,
  id: g.id,
  // Un día sin hora («2026-10-15»): se deja en texto para no correrlo de día
  // al pasarlo por la zona horaria
  playedOn: g.played_on,
  golfCourseId: g.golf_course_id ?? null,
  golfCourseName: g.golf_course_name ?? null,
  format: g.format ?? null,
  relation: g.relation ?? null,
  result: g.result ?? null,
  quickMatchId: g.quick_match_id ?? null,
  competitionId: g.competition_id ?? null,
  competitionName: g.competition_name ?? null,
  matchId: g.match_id ?? null,
});

const paginaDePartidas = (data) => ({
  games: Array.isArray(data?.games) ? data.games.map(partidaJuntos) : [],
  nextCursor: data?.next_cursor ?? null,
});

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

  async getUnseenCount() {
    const data = await apiRequest('/api/v1/users/me/feed/unseen-count');
    const n = data?.unseen_count;
    return Number.isFinite(n) ? n : 0;
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
      // Ya resuelto por el servidor: alias si lo tiene (BE #239)
      displayName: data.display_name || null,
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
      // se puede ver". El correo no se trae: el de otro jugador no se enseña
      // (21 oct)
      handicap: data.handicap ?? null,
      // Las estadísticas pasan por el mismo mapper que las propias: es el
      // mismo DTO del backend, y devolverlo aquí en snake_case obligaría a la
      // pantalla de perfil a leer los campos de otra forma que el resto del
      // frontend.
      stats: data.stats ? PlayerStatsMapper.toDomain(data.stats) : null,
      // Solo entre amigos (BE-3). null para cualquier otro: la pantalla no
      // pinta el bloque, ni un apartado sin partidas
      headToHead: data.head_to_head
        ? {
            against: balanceDe(data.head_to_head.against),
            alongside: balanceDe(data.head_to_head.alongside),
          }
        : null,
      gamesTogether: data.games_together ? paginaDePartidas(data.games_together) : null,
    };
  }

  async getGamesTogether(userId, { cursor = null } = {}) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const data = await apiRequest(`/api/v1/users/${userId}/games-together${query}`);
    return paginaDePartidas(data);
  }

  async getPlayerActivity(userId, { limit = 20, cursor = null } = {}) {
    const data = await apiRequest(
      `/api/v1/users/${userId}/activity${this.#buildQuery({ limit, cursor })}`
    );
    return ActivityEventMapper.feedToDomain(data);
  }

  async setActivitySharing(enabled) {
    const data = await apiRequest('/api/v1/social/activity-sharing', {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    });

    return {
      shareActivity: data.share_activity,
      // El backend siempre lo manda, pero un 0 por defecto evita que la
      // pantalla anuncie "undefined entradas retiradas" si algún día no llega
      removedEvents: data.removed_events ?? 0,
    };
  }
}

export default ApiSocialFeedRepository;
