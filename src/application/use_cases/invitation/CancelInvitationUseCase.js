/**
 * Use Case: Cancel Invitation (FE #724)
 *
 * Whoever invites —the competition creator, whoever sent it, or an admin—
 * withdraws a pending invitation. The invitee is not notified.
 */
class CancelInvitationUseCase {
  #invitationRepository;

  constructor({ invitationRepository }) {
    if (!invitationRepository) {
      throw new Error('CancelInvitationUseCase requires invitationRepository');
    }
    this.#invitationRepository = invitationRepository;
  }

  async execute(invitationId) {
    if (!invitationId || typeof invitationId !== 'string') {
      throw new Error('invitationId is required and must be a string');
    }
    await this.#invitationRepository.cancelInvitation(invitationId);
  }
}

export default CancelInvitationUseCase;
