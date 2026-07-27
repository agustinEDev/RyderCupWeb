import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Remove Quick Match Participant
 *
 * Removes a participant (self-leave for registered players, or creator kick).
 */
class RemoveQuickMatchParticipantUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('RemoveQuickMatchParticipantUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId, participantId) {
    if (!quickMatchId || !participantId) {
      throw new Error('quickMatchId and participantId are required');
    }

    const quickMatch = await this.#quickMatchRepository.removeParticipant(
      quickMatchId,
      participantId
    );
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default RemoveQuickMatchParticipantUseCase;
