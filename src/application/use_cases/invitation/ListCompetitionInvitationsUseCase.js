import InvitationAssembler from '../../assemblers/InvitationAssembler';

/**
 * Use Case: List Competition Invitations
 *
 * Creator retrieves all invitations sent for a competition.
 */
class ListCompetitionInvitationsUseCase {
  #invitationRepository;

  constructor({ invitationRepository }) {
    if (!invitationRepository) {
      throw new Error('ListCompetitionInvitationsUseCase requires invitationRepository');
    }
    this.#invitationRepository = invitationRepository;
  }

  async execute(competitionId, filters = {}) {
    if (!competitionId || typeof competitionId !== 'string') {
      throw new Error('competitionId is required and must be a string');
    }

    const result = await this.#invitationRepository.getCompetitionInvitations(
      competitionId,
      filters
    );

    const dtos = result.invitations.map((invitation) =>
      InvitationAssembler.toSimpleDTO(invitation, invitation._apiData)
    );

    return {
      invitations: dtos,
      totalCount: result.totalCount,
    };
  }
}

export default ListCompetitionInvitationsUseCase;
