import Invitation from '../../domain/entities/Invitation';

/**
 * InvitationAssembler - Application Layer
 *
 * Converts Invitation domain entities to simple DTOs for the UI.
 */
class InvitationAssembler {
  /**
   * Converts a domain entity to a simple DTO for the UI.
   *
   * @param {Invitation} invitation - Domain entity
   * @param {Object} apiData - Original API data (optional, for extra fields)
   * @returns {Object} - Simple DTO for UI (camelCase, flat)
   */
  static toSimpleDTO(invitation, apiData = null) {
    if (!(invitation instanceof Invitation)) {
      throw new Error('InvitationAssembler.toSimpleDTO: invitation must be an Invitation instance');
    }

    const simpleDTO = {
      id: invitation.id,
      competitionId: invitation.competitionId,
      inviterId: invitation.inviterId,
      inviteeEmail: invitation.inviteeEmail,
      inviteeUserId: invitation.inviteeUserId,
      status: invitation.status.toString(),
      personalMessage: invitation.personalMessage,
      expiresAt: invitation.expiresAt?.toISOString() || null,
      respondedAt: invitation.respondedAt?.toISOString() || null,
      createdAt: invitation.createdAt.toISOString(),
      updatedAt: invitation.updatedAt.toISOString(),

      // Computed fields
      isPending: invitation.isPending(),
      isAccepted: invitation.isAccepted(),
      isDeclined: invitation.isDeclined(),
      isExpired: invitation.isExpired(),
      isTerminal: invitation.isTerminal(),
      hasInviteeUser: invitation.hasInviteeUser(),
    };

    // Extra fields from API join data
    if (apiData) {
      if (apiData.competition_name) {
        simpleDTO.competitionName = apiData.competition_name;
      }
      if (apiData.inviter_name) {
        simpleDTO.inviterName = apiData.inviter_name;
      }
      if (apiData.invitee_name) {
        simpleDTO.inviteeName = apiData.invitee_name;
      }
    }

    return simpleDTO;
  }

  /**
   * Converts multiple domain entities to simple DTOs for the UI.
   *
   * @param {Array<Invitation>} invitations - Array of domain entities
   * @param {Array<Object>} apiDataArray - Array of original API data (optional)
   * @returns {Array<Object>} Array of simple DTOs for UI
   */
  static toSimpleDTOMany(invitations, apiDataArray = null) {
    if (!Array.isArray(invitations)) {
      throw new Error('InvitationAssembler.toSimpleDTOMany: invitations must be an array');
    }

    return invitations.map((invitation, index) => {
      const apiData = apiDataArray ? apiDataArray[index] : null;
      return InvitationAssembler.toSimpleDTO(invitation, apiData);
    });
  }
}

export default InvitationAssembler;
