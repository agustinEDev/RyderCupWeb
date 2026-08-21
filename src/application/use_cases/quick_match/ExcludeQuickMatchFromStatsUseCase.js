import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Exclude Quick Match From Stats
 *
 * Stops the match counting towards the current user's statistics. The match
 * STAYS in their history, flagged, and the flag can be lifted again with
 * IncludeQuickMatchInStatsUseCase.
 *
 * Different from hiding it, which removes it from the list for good. Only a
 * finished match can be flagged: one still in progress does not count anywhere
 * yet, so the server answers 409.
 */
class ExcludeQuickMatchFromStatsUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('ExcludeQuickMatchFromStatsUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId) {
    if (!quickMatchId) {
      throw new Error('quickMatchId is required');
    }

    const quickMatch = await this.#quickMatchRepository.excludeFromStats(quickMatchId);
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default ExcludeQuickMatchFromStatsUseCase;
