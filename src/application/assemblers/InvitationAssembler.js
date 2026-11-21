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
   * @param {{competitionName?: string, inviterName?: string, inviteeName?: string, enrollmentId?: string}|null} extras
   *   - Join fields from the repository (optional, camelCase)
   * @returns {Object} - Simple DTO for UI (camelCase, flat)
   */
  static toSimpleDTO(invitation, extras = null) {
    if (!(invitation instanceof Invitation)) {
      throw new Error(
        'InvitationAssembler.toSimpleDTO: invitation must be an Invitation instance',
      );
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
      isOnHold: invitation.isOnHold(),
      isAccepted: invitation.isAccepted(),
      isDeclined: invitation.isDeclined(),
      isExpired: invitation.isExpired(),
      isTerminal: invitation.isTerminal(),
      hasInviteeUser: invitation.hasInviteeUser(),
    };

    // Extra fields from the join (names)
    if (extras) {
      if (extras.competitionName) {
        simpleDTO.competitionName = extras.competitionName;
      }
      if (extras.inviterName) {
        simpleDTO.inviterName = extras.inviterName;
      }
      if (extras.inviteeName) {
        simpleDTO.inviteeName = extras.inviteeName;
      }
      // La inscripción que crea aceptarla: su barra se guarda en ella
      // (barras por campo)
      if (extras.enrollmentId) {
        simpleDTO.enrollmentId = extras.enrollmentId;
      }
    }

    return simpleDTO;
  }

  /**
   * Converts multiple domain entities to simple DTOs for the UI.
   *
   * @param {Array<Invitation>} invitations - Array of domain entities
   * @param {Array<Object|null>} extrasArray - Array of join fields (optional)
   * @returns {Array<Object>} Array of simple DTOs for UI
   */
  static toSimpleDTOMany(invitations, extrasArray = null) {
    if (!Array.isArray(invitations)) {
      throw new Error(
        'InvitationAssembler.toSimpleDTOMany: invitations must be an array',
      );
    }

    return invitations.map((invitation, index) => {
      const extras = extrasArray ? extrasArray[index] : null;
      return InvitationAssembler.toSimpleDTO(invitation, extras);
    });
  }
}

export default InvitationAssembler;
