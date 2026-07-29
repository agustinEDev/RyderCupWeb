import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Cancel Quick Match
 *
 * Creator cancels the quick match (from PENDING or IN_PROGRESS).
 */
class CancelQuickMatchUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('CancelQuickMatchUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId) {
    if (!quickMatchId) {
      throw new Error('quickMatchId is required');
    }

    const quickMatch = await this.#quickMatchRepository.cancel(quickMatchId);
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default CancelQuickMatchUseCase;
