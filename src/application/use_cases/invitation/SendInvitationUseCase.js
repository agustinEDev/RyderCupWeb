import InvitationAssembler from '../../assemblers/InvitationAssembler';

/**
 * Use Case: Send Invitation by User ID
 *
 * Creator invites a registered user to a competition.
 */
class SendInvitationUseCase {
  #invitationRepository;

  constructor({ invitationRepository }) {
    if (!invitationRepository) {
      throw new Error('SendInvitationUseCase requires invitationRepository');
    }
    this.#invitationRepository = invitationRepository;
  }

  async execute(competitionId, inviteeUserId, personalMessage = null) {
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('competitionId is required and must be a string');
    }
    if (!inviteeUserId || typeof inviteeUserId !== 'string') {
      throw new Error('inviteeUserId is required and must be a string');
    }

    const invitation = await this.#invitationRepository.sendInvitation(
      competitionId,
      inviteeUserId,
      personalMessage
    );

    return InvitationAssembler.toSimpleDTO(invitation, invitation._apiData);
  }
}

export default SendInvitationUseCase;
