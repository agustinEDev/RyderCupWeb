import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Add Guest Participant
 *
 * Adds a guest (no account) as a quick match participant by hand.
 */
class AddGuestParticipantUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('AddGuestParticipantUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId, guest) {
    if (!quickMatchId) {
      throw new Error('quickMatchId is required');
    }
    if (!guest?.firstName || !guest?.lastName) {
      throw new Error('guest.firstName and guest.lastName are required');
    }

    const quickMatch = await this.#quickMatchRepository.addGuestParticipant(quickMatchId, guest);
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default AddGuestParticipantUseCase;
