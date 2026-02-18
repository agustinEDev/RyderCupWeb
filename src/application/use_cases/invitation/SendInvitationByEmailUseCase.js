import Email from '../../../domain/value_objects/Email';
import InvitationAssembler from '../../assemblers/InvitationAssembler';

/**
 * Use Case: Send Invitation by Email
 *
 * Creator invites a player by email address (registered or not).
 * Uses Email VO for validation.
 */
class SendInvitationByEmailUseCase {
  #invitationRepository;

  constructor({ invitationRepository }) {
    if (!invitationRepository) {
      throw new Error('SendInvitationByEmailUseCase requires invitationRepository');
    }
    this.#invitationRepository = invitationRepository;
  }

  async execute(competitionId, emailString, personalMessage = null) {
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('competitionId is required and must be a string');
    }

    // Validate email using Email Value Object
    const email = new Email(emailString);

    // Validate personal message length
    if (personalMessage && personalMessage.length > 500) {
      throw new Error('Personal message must be 500 characters or less');
    }

    const invitation = await this.#invitationRepository.sendInvitationByEmail(
      competitionId,
      email.getValue(),
      personalMessage
    );

    return InvitationAssembler.toSimpleDTO(invitation, invitation._apiData);
  }
}

export default SendInvitationByEmailUseCase;
