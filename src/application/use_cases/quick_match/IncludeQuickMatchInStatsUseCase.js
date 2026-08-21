import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Include Quick Match In Stats
 *
 * Reverses ExcludeQuickMatchFromStatsUseCase: the match counts again towards
 * the current user's statistics. Idempotent, and allowed in any status —
 * lifting a flag is always safe.
 */
class IncludeQuickMatchInStatsUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('IncludeQuickMatchInStatsUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId) {
    if (!quickMatchId) {
      throw new Error('quickMatchId is required');
    }

    const quickMatch = await this.#quickMatchRepository.includeInStats(quickMatchId);
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default IncludeQuickMatchInStatsUseCase;
