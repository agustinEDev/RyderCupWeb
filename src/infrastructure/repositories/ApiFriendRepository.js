import IFriendRepository from '../../domain/repositories/IFriendRepository';
import FriendshipMapper from '../mappers/FriendshipMapper';
import apiRequest from '../../services/api.js';

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

  async sendRequest(addresseeId) {
    const apiData = await apiRequest('/api/v1/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ addressee_id: addresseeId }),
    });

    const friendship = FriendshipMapper.toDomain(apiData);
    friendship._apiData = apiData;
    return friendship;
  }

  async respondToRequest(friendshipId, action) {
    const apiData = await apiRequest(`/api/v1/friends/requests/${friendshipId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });

    const friendship = FriendshipMapper.toDomain(apiData);
    friendship._apiData = apiData;
    return friendship;
  }

  async removeFriend(friendshipId) {
    await apiRequest(`/api/v1/friends/${friendshipId}`, {
      method: 'DELETE',
    });
  }

  async blockUser(userId) {
    const apiData = await apiRequest(`/api/v1/friends/${userId}/block`, {
      method: 'POST',
    });

    const friendship = FriendshipMapper.toDomain(apiData);
    friendship._apiData = apiData;
    return friendship;
  }

  async getFriends(filters = {}) {
    const apiFilters = {};
    if (filters.page) apiFilters.page = filters.page;
    if (filters.limit) apiFilters.limit = filters.limit;

    const queryString = this.#buildQueryString(apiFilters);
    const response = await apiRequest(`/api/v1/friends/me${queryString}`);

    const apiDataArray = response.friendships || [];
    const friendships = FriendshipMapper.toDomainMany(apiDataArray);

    friendships.forEach((friendship, index) => {
      friendship._apiData = apiDataArray[index];
    });

    return {
      friendships,
      totalCount: response.total_count || 0,
    };
  }

  async getPendingRequests(direction, filters = {}) {
    const apiFilters = { direction };
    if (filters.page) apiFilters.page = filters.page;
    if (filters.limit) apiFilters.limit = filters.limit;

    const queryString = this.#buildQueryString(apiFilters);
    const response = await apiRequest(`/api/v1/friends/requests/me${queryString}`);

    const apiDataArray = response.friendships || [];
    const friendships = FriendshipMapper.toDomainMany(apiDataArray);

    friendships.forEach((friendship, index) => {
      friendship._apiData = apiDataArray[index];
    });

    return {
      friendships,
      totalCount: response.total_count || 0,
    };
  }
}

export default ApiFriendRepository;
