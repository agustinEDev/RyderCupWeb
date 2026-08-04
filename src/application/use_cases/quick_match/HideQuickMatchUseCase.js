import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Hide Quick Match
 *
 * Hides the quick match from the current user's own history.
 *
 * It does NOT delete the match: the other participants keep seeing it in their
 * own lists. Any participant can hide it for themselves, in any status, and the
 * operation is idempotent.
 */
class HideQuickMatchUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('HideQuickMatchUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId) {
    if (!quickMatchId) {
      throw new Error('quickMatchId is required');
    }

    const quickMatch = await this.#quickMatchRepository.hide(quickMatchId);
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default HideQuickMatchUseCase;
