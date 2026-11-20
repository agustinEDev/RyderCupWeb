import IFriendRepository from '../../domain/repositories/IFriendRepository';
import FriendshipMapper from '../mappers/FriendshipMapper';
import apiRequest from '../http/api.js';
import { segmento } from '../http/api';

/** @typedef {import('../../domain/entities/Friendship').default} Friendship */
/** @typedef {import('../mappers/FriendshipMapper').FriendshipExtras} FriendshipExtras */
/** @typedef {{entity: Friendship, extras: FriendshipExtras|null}} FriendshipWithExtras */

/**
 * ApiFriendRepository - REST API implementation
 *
 * Endpoints:
 * - POST   /api/v1/friends/requests
 * - POST   /api/v1/friends/requests/{id}/respond
 * - DELETE /api/v1/friends/{id}
 * - POST   /api/v1/friends/{userId}/block
 * - GET    /api/v1/friends/me
 * - GET    /api/v1/friends/requests/me
 */
class ApiFriendRepository extends IFriendRepository {
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

  /** @returns {Promise<FriendshipWithExtras>} */
  async sendRequest(addresseeId) {
    const apiData = await apiRequest('/api/v1/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ addressee_id: addresseeId }),
    });

    return {
      entity: FriendshipMapper.toDomain(apiData),
      extras: FriendshipMapper.toExtras(apiData),
    };
  }

  /** @returns {Promise<FriendshipWithExtras>} */
  async respondToRequest(friendshipId, action) {
    const apiData = await apiRequest(
      `/api/v1/friends/requests/${segmento(friendshipId)}/respond`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      },
    );

    return {
      entity: FriendshipMapper.toDomain(apiData),
      extras: FriendshipMapper.toExtras(apiData),
    };
  }

  async removeFriend(friendshipId) {
    await apiRequest(`/api/v1/friends/${segmento(friendshipId)}`, {
      method: 'DELETE',
    });
  }

  /** @returns {Promise<FriendshipWithExtras>} */
  async blockUser(userId) {
    const apiData = await apiRequest(
      `/api/v1/friends/${segmento(userId)}/block`,
      {
        method: 'POST',
      },
    );

    return {
      entity: FriendshipMapper.toDomain(apiData),
      extras: FriendshipMapper.toExtras(apiData),
    };
  }

  /** @returns {Promise<{friendships: FriendshipWithExtras[], totalCount: number}>} */
  async getFriends(filters = {}) {
    const apiFilters = {};
    if (filters.page) apiFilters.page = filters.page;
    if (filters.limit) apiFilters.limit = filters.limit;

    const queryString = this.#buildQueryString(apiFilters);
    const response = await apiRequest(`/api/v1/friends/me${queryString}`);

    const apiDataArray = response.friendships || [];
    const entities = FriendshipMapper.toDomainMany(apiDataArray);

    return {
      friendships: entities.map((entity, index) => ({
        entity,
        extras: FriendshipMapper.toExtras(apiDataArray[index]),
      })),
      totalCount: response.total_count || 0,
    };
  }

  /** @returns {Promise<{friendships: FriendshipWithExtras[], totalCount: number}>} */
  async getPendingRequests(direction, filters = {}) {
    const apiFilters = { direction };
    if (filters.page) apiFilters.page = filters.page;
    if (filters.limit) apiFilters.limit = filters.limit;

    const queryString = this.#buildQueryString(apiFilters);
    const response = await apiRequest(
      `/api/v1/friends/requests/me${queryString}`,
    );

    const apiDataArray = response.friendships || [];
    const entities = FriendshipMapper.toDomainMany(apiDataArray);

    return {
      friendships: entities.map((entity, index) => ({
        entity,
        extras: FriendshipMapper.toExtras(apiDataArray[index]),
      })),
      totalCount: response.total_count || 0,
    };
  }
}

export default ApiFriendRepository;
