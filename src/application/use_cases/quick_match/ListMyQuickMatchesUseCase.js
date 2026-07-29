import QuickMatchAssembler from '../../assemblers/QuickMatchAssembler';

/**
 * Use Case: List My Quick Matches
 *
 * Lists quick matches the current user participates in.
 */
class ListMyQuickMatchesUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('ListMyQuickMatchesUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(filters = {}) {
    const result = await this.#quickMatchRepository.listMine(filters);

    return {
      quickMatches: QuickMatchAssembler.toSimpleDTOMany(result.quickMatches),
      totalCount: result.totalCount,
      page: result.page,
      limit: result.limit,
    };
  }
}

export default ListMyQuickMatchesUseCase;
