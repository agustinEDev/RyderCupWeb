import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Set Quick Match Participant Handicap
 *
 * Sets/overrides a participant's handicap (creator only, while PENDING) —
 * used from the pre-start summary to fix a registered participant without
 * a handicap on their profile, or to correct a guest's manual handicap.
 */
class SetQuickMatchParticipantHandicapUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('SetQuickMatchParticipantHandicapUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId, participantId, handicap) {
    if (!quickMatchId || !participantId) {
      throw new Error('quickMatchId and participantId are required');
    }
    if (handicap !== null && !Number.isFinite(handicap)) {
      throw new Error('handicap must be a finite number or null');
    }

    const quickMatch = await this.#quickMatchRepository.setParticipantHandicap(
      quickMatchId,
      participantId,
      handicap
    );
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default SetQuickMatchParticipantHandicapUseCase;
