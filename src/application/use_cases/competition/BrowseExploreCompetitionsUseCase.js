// src/application/use-cases/competition/BrowseExploreCompetitionsUseCase.js

import CompetitionMapper from '../../../infrastructure/mappers/CompetitionMapper';

/**
 * Use case for browsing competitions that are in progress, closed, or completed.
 *
 * This use case returns competitions that:
 * - Are in CLOSED, IN_PROGRESS, or COMPLETED status
 * - Are publicly visible for exploration and viewing results
 * - Can include competitions where the user is creator or enrolled
 *
 * This is a read-only view for users to explore tournament results,
 * check scores, and see completed competitions.
 *
 * Responsibilities:
 * - Validate input (search filters)
 * - Call repository with appropriate filters
 * - Convert domain entities to simple DTOs for the UI
 */
class BrowseExploreCompetitionsUseCase {
  /**
   * @param {ICompetitionRepository} competitionRepository - The competition repository
   */
  constructor(competitionRepository) {
    if (!competitionRepository) {
      throw new Error('BrowseExploreCompetitionsUseCase requires a competitionRepository');
    }
    this.competitionRepository = competitionRepository;
  }

  /**
   * Execute the use case to get explorable competitions.
   *
   * @param {object} filters - Optional search filters
   * @param {string} filters.searchName - Search by competition name (partial match)
   * @param {string} filters.searchCreator - Search by creator name (partial match)
   * @param {number} filters.limit - Maximum number of results (default: 50)
   * @param {number} filters.offset - Pagination offset (default: 0)
   * @returns {Promise<object[]>} Array of competition DTOs
   *
   * @example
   * const competitions = await useCase.execute({ searchName: 'masters' });
   * // Returns: [{ id, name, status, startDate, ... }]
   */
  async execute(filters = {}) {
    console.log('🔍 [BrowseExploreCompetitionsUseCase] Executing with filters:', filters);

    // Build repository filters
    const repositoryFilters = {
      status: ['CLOSED', 'IN_PROGRESS', 'COMPLETED'], // Only competitions that are not accepting enrollments
      excludeMyCompetitions: false, // Include all competitions (including mine)
      searchName: filters.searchName,
      searchCreator: filters.searchCreator,
      limit: filters.limit || 50,
      offset: filters.offset || 0
    };

    // Call repository to get domain entities
    const competitions = await this.competitionRepository.findPublic(repositoryFilters);

    console.log('✅ [BrowseExploreCompetitionsUseCase] Found', competitions.length, 'explorable competitions');

    // Convert domain entities to simple DTOs for the UI
    const competitionDTOs = competitions.map((competition) => {
      return CompetitionMapper.toSimpleDTO(competition);
    });

    return competitionDTOs;
  }
}

export default BrowseExploreCompetitionsUseCase;
