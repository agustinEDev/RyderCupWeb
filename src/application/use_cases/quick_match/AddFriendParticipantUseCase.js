import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Add Friend Participant
 *
 * Adds an accepted friend directly as a quick match participant.
 */
class AddFriendParticipantUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('AddFriendParticipantUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId, friendUserId, team = null, options = {}) {
    if (!quickMatchId || !friendUserId) {
      throw new Error('quickMatchId and friendUserId are required');
    }

    const quickMatch = await this.#quickMatchRepository.addFriendParticipant(
      quickMatchId,
      friendUserId,
      team,
      options
    );
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default AddFriendParticipantUseCase;
