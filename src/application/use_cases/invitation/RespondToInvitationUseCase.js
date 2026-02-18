import InvitationAssembler from '../../assemblers/InvitationAssembler';

/**
 * Use Case: Respond to Invitation
 *
 * Player accepts or declines an invitation.
 */
class RespondToInvitationUseCase {
  #invitationRepository;

  constructor({ invitationRepository }) {
    if (!invitationRepository) {
      throw new Error('RespondToInvitationUseCase requires invitationRepository');
    }
    this.#invitationRepository = invitationRepository;
  }

  async execute(invitationId, action) {
    if (!invitationId || typeof invitationId !== 'string') {
      throw new Error('invitationId is required and must be a string');
    }

    const validActions = ['ACCEPT', 'DECLINE'];
    if (!validActions.includes(action)) {
      throw new Error(`action must be one of: ${validActions.join(', ')}`);
    }

    const invitation = await this.#invitationRepository.respondToInvitation(
      invitationId,
      action
    );

    return InvitationAssembler.toSimpleDTO(invitation, invitation._apiData);
  }
}

export default RespondToInvitationUseCase;
