import InvitationAssembler from '../../assemblers/InvitationAssembler';

/**
 * Use Case: List My Invitations
 *
 * Player retrieves their received invitations with optional filters.
 */
class ListMyInvitationsUseCase {
  #invitationRepository;

  constructor({ invitationRepository }) {
    if (!invitationRepository) {
      throw new Error('ListMyInvitationsUseCase requires invitationRepository');
    }
    this.#invitationRepository = invitationRepository;
  }

  async execute(filters = {}) {
    const result = await this.#invitationRepository.getMyInvitations(filters);

    const dtos = result.invitations.map((invitation) =>
      InvitationAssembler.toSimpleDTO(invitation, invitation._apiData)
    );

    return {
      invitations: dtos,
      totalCount: result.totalCount,
    };
  }
}

export default ListMyInvitationsUseCase;
