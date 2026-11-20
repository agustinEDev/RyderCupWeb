import Friendship from '../../domain/entities/Friendship';
import FriendshipStatus from '../../domain/value_objects/FriendshipStatus';
import { instanteDeLaApi } from '../../utils/instanteDeLaApi';
import { aCamelCase } from './aCamelCase';

/**
 * @typedef {Object} FriendshipExtras
 * @property {string|null|undefined} requesterName
 * @property {string|null|undefined} addresseeName
 * @property {string|null|undefined} requesterAlias
 * @property {string|null|undefined} addresseeAlias
 * @property {string|null|undefined} requesterRealName
 * @property {string|null|undefined} addresseeRealName
 * @property {number|null|undefined} requesterHandicap
 * @property {number|null|undefined} addresseeHandicap
 */

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

    if (
      !apiData.id ||
      !apiData.requester_id ||
      !apiData.addressee_id ||
      !apiData.status
    ) {
      throw new Error(
        'FriendshipMapper.toDomain: Missing required fields (id, requester_id, addressee_id, status)',
      );
    }

    return Friendship.fromPersistence({
      id: apiData.id,
      requesterId: apiData.requester_id,
      addresseeId: apiData.addressee_id,
      status: FriendshipStatus.fromString(apiData.status),
      respondedAt: apiData.responded_at
        ? instanteDeLaApi(apiData.responded_at)
        : null,
      createdAt: apiData.created_at && instanteDeLaApi(apiData.created_at),
      updatedAt: apiData.updated_at && instanteDeLaApi(apiData.updated_at),
    });
  }

  /**
   * Los datos de la API que no son de la entidad y la pantalla necesita (los
   * nombres, alias, nombres reales y hándicaps de los dos lados), en camelCase.
   * Los valores van tal cual: si la API no manda un campo, queda undefined.
   *
   * @param {Object|null|undefined} apiData - API response data (snake_case)
   * @returns {FriendshipExtras|null} null si no hay datos de la API
   */
  static toExtras(apiData) {
    return apiData ? aCamelCase(apiData) : null;
  }

  /**
   * Convert multiple API DTOs to domain entities
   *
   * @param {Array<Object>} apiDataArray - Array of API response data
   * @returns {Array<Friendship>} Array of domain entities
   */
  static toDomainMany(apiDataArray) {
    if (!Array.isArray(apiDataArray)) {
      throw new Error(
        'FriendshipMapper.toDomainMany: apiDataArray must be an array',
      );
    }

    return apiDataArray.map((apiData) => FriendshipMapper.toDomain(apiData));
  }
}

export default FriendshipMapper;
