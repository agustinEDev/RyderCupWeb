// src/application/use-cases/competition/BrowseJoinableCompetitionsUseCase.js

import CompetitionMapper from '../../../infrastructure/mappers/CompetitionMapper';

/**
 * Use case for browsing competitions that are available to join.
 *
 * This use case returns competitions that:
 * - Are in ACTIVE status (accepting enrollments)
 * - The user is NOT the creator
 * - The user is NOT already enrolled
 *
 * Responsibilities:
 * - Validate input (search filters)
 * - Call repository with appropriate filters
 * - Convert domain entities to simple DTOs for the UI
 */
class BrowseJoinableCompetitionsUseCase {
  /**
   * @param {ICompetitionRepository} competitionRepository - The competition repository
   */
  constructor(competitionRepository) {
    if (!competitionRepository) {
      throw new Error('BrowseJoinableCompetitionsUseCase requires a competitionRepository');
    }
    this.competitionRepository = competitionRepository;
  }

  /**
   * Execute the use case to get joinable competitions.
   *
   * @param {object} filters - Optional search filters
   * @param {string} filters.searchName - Search by competition name (partial match)
   * @param {string} filters.searchCreator - Search by creator name (partial match)
   * @param {number} filters.limit - Maximum number of results (default: 50)
   * @param {number} filters.offset - Pagination offset (default: 0)
   * @returns {Promise<object[]>} Array of competition DTOs
   *
   * @example
   * const competitions = await useCase.execute({ searchName: 'ryder' });
   * // Returns: [{ id, name, status, startDate, ... }]
   */
  async execute(filters = {}) {
    console.log('🎯 [BrowseJoinableCompetitionsUseCase] Executing with filters:', filters);

    // Build repository filters
    const repositoryFilters = {
      status: 'ACTIVE', // Only competitions accepting enrollments
      excludeMyCompetitions: true, // Don't show competitions where I'm creator/enrolled
      searchName: filters.searchName,
      searchCreator: filters.searchCreator,
      limit: filters.limit || 50,
      offset: filters.offset || 0
    };

    // Call repository to get domain entities
    const competitions = await this.competitionRepository.findPublic(repositoryFilters);

    console.log('✅ [BrowseJoinableCompetitionsUseCase] Found', competitions.length, 'joinable competitions');

    // Convert domain entities to simple DTOs for the UI
    const competitionDTOs = competitions.map((competition) => {
      return CompetitionMapper.toSimpleDTO(competition, competition._apiData);
    });

    return competitionDTOs;
  }
}

export default BrowseJoinableCompetitionsUseCase;
