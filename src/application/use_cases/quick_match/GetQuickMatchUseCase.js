import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: Get Quick Match
 *
 * Retrieves quick match detail: participants, hole scores, standing, and
 * scoring assignments (who records for whom).
 */
class GetQuickMatchUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('GetQuickMatchUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId) {
    if (!quickMatchId) {
      throw new Error('quickMatchId is required');
    }

    const quickMatch = await this.#quickMatchRepository.get(quickMatchId);
    return QuickMatchAssembler.toSimpleDTO(quickMatch);
  }
}

export default GetQuickMatchUseCase;
