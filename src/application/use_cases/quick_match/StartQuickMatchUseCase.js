import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Start Quick Match
 *
 * Starts the quick match once the roster is complete, choosing 1 to 4
 * registered participants (creator always included) as scorers.
 */
class StartQuickMatchUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('StartQuickMatchUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId, scorerIds) {
    if (!quickMatchId) {
      throw new Error('quickMatchId is required');
    }
    if (!Array.isArray(scorerIds) || scorerIds.length === 0) {
      throw new Error('scorerIds must be a non-empty array');
    }

    const quickMatch = await this.#quickMatchRepository.start(quickMatchId, scorerIds);
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default StartQuickMatchUseCase;
