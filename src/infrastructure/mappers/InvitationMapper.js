import Invitation from '../../domain/entities/Invitation';
import InvitationStatus from '../../domain/value_objects/InvitationStatus';
import { aCamelCase } from './aCamelCase';

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

    if (
      !apiData.id ||
      !apiData.competition_id ||
      !apiData.inviter_id ||
      !(apiData.invitee_email || apiData.invitee_user_id) ||
      !apiData.status
    ) {
      throw new Error(
        'InvitationMapper.toDomain: Missing required fields (id, competition_id, inviter_id, invitee_email or invitee_user_id, status)',
      );
    }

    return Invitation.fromPersistence({
      id: apiData.id,
      competitionId: apiData.competition_id,
      inviterId: apiData.inviter_id,
      inviteeEmail: apiData.invitee_email || null,
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
   * Extract the join fields the API sends next to the invitation (names of the
   * competition, inviter and invitee), copied as they come: a missing field
   * stays undefined.
   *
   * @param {Object|null|undefined} apiData - API response data (snake_case)
   * @returns {{competitionName: *, inviterName: *, inviteeName: *}|null}
   */
  static toExtras(apiData) {
    return apiData ? aCamelCase(apiData) : null;
  }

  /**
   * Convert multiple API DTOs to domain entities
   *
   * @param {Array<Object>} apiDataArray - Array of API response data
   * @returns {Array<Invitation>} Array of domain entities
   */
  static toDomainMany(apiDataArray) {
    if (!Array.isArray(apiDataArray)) {
      throw new Error(
        'InvitationMapper.toDomainMany: apiDataArray must be an array',
      );
    }

    return apiDataArray.map((apiData) => InvitationMapper.toDomain(apiData));
  }
}

export default InvitationMapper;
