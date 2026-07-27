import Friendship from '../../domain/entities/Friendship';
import FriendshipStatus from '../../domain/value_objects/FriendshipStatus';

/**
 * FriendshipMapper - Anti-Corruption Layer
 *
 * Converts API DTOs (snake_case) -> Domain Entities (camelCase).
 * DTO conversion for UI is handled by FriendshipAssembler (application layer).
 */
class FriendshipMapper {
  /**
   * Convert an API DTO to a domain entity
   *
   * @param {Object} apiData - API response data (snake_case)
   * @returns {Friendship} Domain entity
   */
  static toDomain(apiData) {
    if (!apiData) {
      throw new Error('FriendshipMapper.toDomain: apiData is required');
    }

    if (!apiData.id || !apiData.requester_id || !apiData.addressee_id || !apiData.status) {
      throw new Error(
        'FriendshipMapper.toDomain: Missing required fields (id, requester_id, addressee_id, status)'
      );
    }

    return Friendship.fromPersistence({
      id: apiData.id,
      requesterId: apiData.requester_id,
      addresseeId: apiData.addressee_id,
      status: FriendshipStatus.fromString(apiData.status),
      respondedAt: apiData.responded_at || null,
      createdAt: apiData.created_at,
      updatedAt: apiData.updated_at,
    });
  }

  /**
   * Convert multiple API DTOs to domain entities
   *
   * @param {Array<Object>} apiDataArray - Array of API response data
   * @returns {Array<Friendship>} Array of domain entities
   */
  static toDomainMany(apiDataArray) {
    if (!Array.isArray(apiDataArray)) {
      throw new Error('FriendshipMapper.toDomainMany: apiDataArray must be an array');
    }

    return apiDataArray.map((apiData) => FriendshipMapper.toDomain(apiData));
  }
}

export default FriendshipMapper;
