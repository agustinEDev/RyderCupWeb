import CompetitionAssembler from '../../assemblers/CompetitionAssembler';

/**
 * Use case for listing every competition in the system, regardless of status
 * or creator, for the admin panel Competitions tab.
 *
 * Unlike BrowseExploreCompetitionsUseCase (public exploration, restricted to
 * CLOSED/IN_PROGRESS/COMPLETED), this returns competitions in any status
 * (including DRAFT and ACTIVE) so admins can spot and unstick stalled ones.
 */
class AdminListCompetitionsUseCase {
  /**
   * @param {ICompetitionRepository} competitionRepository - The competition repository
   */
  constructor(competitionRepository) {
    if (!competitionRepository) {
      throw new Error('AdminListCompetitionsUseCase requires a competitionRepository');
    }
    this.competitionRepository = competitionRepository;
  }

  /**
   * Execute the use case to list all competitions.
   *
   * @param {object} filters - Optional search filters
   * @param {string} filters.searchName - Search by competition name (partial match)
   * @param {string} filters.searchCreator - Search by creator name (partial match)
   * @param {number} filters.limit - Maximum number of results (default: 100)
   * @param {number} filters.offset - Pagination offset (default: 0)
   * @returns {Promise<object[]>} Array of competition DTOs
   */
  async execute(filters = {}) {
    const repositoryFilters = {
      searchName: filters.searchName,
      searchCreator: filters.searchCreator,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
    };

    const competitions = await this.competitionRepository.findPublic(repositoryFilters);

    return competitions.map((competition) =>
      CompetitionAssembler.toSimpleDTO(competition, competition._apiData)
    );
  }
}

export default AdminListCompetitionsUseCase;
