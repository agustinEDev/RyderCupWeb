import Invitation from '../../domain/entities/Invitation';
import InvitationStatus from '../../domain/value_objects/InvitationStatus';

/**
 * InvitationMapper - Anti-Corruption Layer
 *
 * Converts API DTOs (snake_case) -> Domain Entities (camelCase).
 * DTO conversion for UI is handled by InvitationAssembler (application layer).
 */
class InvitationMapper {
  /**
   * Convert an API DTO to a domain entity
   *
   * @param {Object} apiData - API response data (snake_case)
   * @returns {Invitation} Domain entity
   */
  static toDomain(apiData) {
    if (!apiData) {
      throw new Error('InvitationMapper.toDomain: apiData is required');
    }

    if (!apiData.id || !apiData.competition_id || !apiData.inviter_id || !apiData.invitee_email || !apiData.status) {
      throw new Error(
        'InvitationMapper.toDomain: Missing required fields (id, competition_id, inviter_id, invitee_email, status)'
      );
    }

    return Invitation.fromPersistence({
      id: apiData.id,
      competitionId: apiData.competition_id,
      inviterId: apiData.inviter_id,
      inviteeEmail: apiData.invitee_email,
      inviteeUserId: apiData.invitee_user_id || null,
      status: InvitationStatus.fromString(apiData.status),
      personalMessage: apiData.personal_message || null,
      expiresAt: apiData.expires_at || null,
      respondedAt: apiData.responded_at || null,
      createdAt: apiData.created_at,
      updatedAt: apiData.updated_at,
    });
  }

  /**
   * Convert multiple API DTOs to domain entities
   *
   * @param {Array<Object>} apiDataArray - Array of API response data
   * @returns {Array<Invitation>} Array of domain entities
   */
  static toDomainMany(apiDataArray) {
    if (!Array.isArray(apiDataArray)) {
      throw new Error('InvitationMapper.toDomainMany: apiDataArray must be an array');
    }

    return apiDataArray.map((apiData) => InvitationMapper.toDomain(apiData));
  }
}

export default InvitationMapper;
