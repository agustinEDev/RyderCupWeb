import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Complete Quick Match
 *
 * Creator marks the quick match as completed.
 */
class CompleteQuickMatchUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('CompleteQuickMatchUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId) {
    if (!quickMatchId) {
      throw new Error('quickMatchId is required');
    }

    const quickMatch = await this.#quickMatchRepository.complete(quickMatchId);
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default CompleteQuickMatchUseCase;
