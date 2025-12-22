import { ICompetitionRepository } from '../../domain/repositories/ICompetitionRepository';
import CompetitionMapper from '../mappers/CompetitionMapper';
import apiRequest from '../../services/api.js';

class ApiCompetitionRepository extends ICompetitionRepository {
  /**
   * Creates a new competition via the API.
   * @override
   * @param {Object} competitionData - The data for the new competition (API DTO format).
   * @returns {Promise<Competition>} - The newly created competition entity.
   */
  async save(competitionData) {
    const apiData = await apiRequest('/api/v1/competitions', {
      method: 'POST',
      body: JSON.stringify(competitionData)
    });

    // Map API response to Competition domain entity
    const competition = CompetitionMapper.toDomain(apiData);

    return competition;
  }

  /**
   * Finds a competition by its unique ID.
   * @override
   * @param {string} competitionId - The ID of the competition to find.
   * @returns {Promise<Competition>} - The competition entity.
   * @throws {Error} If the competition is not found or the request fails.
   */
  async findById(competitionId) {
    const apiData = await apiRequest(`/api/v1/competitions/${competitionId}`);

    // Map API response to Competition domain entity
    const competition = CompetitionMapper.toDomain(apiData);

    // Attach original API data for mapper to use (for location names, etc.)
    competition._apiData = apiData;

    return competition;
  }

  /**
   * Finds all competitions for a specific user (creator OR enrolled).
   * @override
   * @param {string} userId - The ID of the user/creator.
   * @param {object} filters - Optional filters (status, etc.)
   * @returns {Promise<Competition[]>} - Array of competition entities.
   */
  async findByCreator(userId, filters = {}) {
    // Build query parameters
    // Note: Backend automatically filters by authenticated user from JWT token
    // No need to send creator_id explicitly
    const queryParams = new URLSearchParams(filters);

    // CRITICAL: Add my_competitions=true to get competitions where user is creator OR enrolled
    queryParams.append('my_competitions', 'true');

    const endpoint = `/api/v1/competitions${queryParams.toString() ? '?' + queryParams : ''}`;
    console.log('🔍 [ApiCompetitionRepository.findByCreator] Fetching MY competitions from:', endpoint);

    const apiDataArray = await apiRequest(endpoint);

    // Map each API response to Competition domain entity
    // Attach original API data for mapper to use
    const competitions = apiDataArray.map((apiData) => {
      const competition = CompetitionMapper.toDomain(apiData);
      competition._apiData = apiData;
      return competition;
    });

    return competitions;
  }

  /**
   * Finds public competitions with optional filters.
   * @override
   * @param {object} filters - Optional filters for the search.
   * @param {string|string[]} filters.status - Competition status (e.g., 'ACTIVE', ['CLOSED', 'IN_PROGRESS'])
   * @param {string} filters.searchName - Search by competition name (partial match)
   * @param {string} filters.searchCreator - Search by creator name (partial match)
   * @param {boolean} filters.excludeMyCompetitions - If true, excludes competitions where user is creator or enrolled
   * @param {number} filters.limit - Maximum number of results
   * @param {number} filters.offset - Pagination offset
   * @returns {Promise<Competition[]>} - Array of public competition entities.
   */
  async findPublic(filters = {}) {
    // Build query parameters
    const queryParams = new URLSearchParams();

    // Handle status filter (can be string or array)
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        // Multiple statuses: add each one as a separate query param
        filters.status.forEach(status => {
          queryParams.append('status', status);
        });
      } else {
        // Single status
        queryParams.append('status', filters.status);
      }
    }

    // Handle search filters
    if (filters.searchName) {
      queryParams.append('search_name', filters.searchName);
    }

    if (filters.searchCreator) {
      queryParams.append('search_creator', filters.searchCreator);
    }

    // Handle my_competitions filter
    if (filters.excludeMyCompetitions) {
      queryParams.append('my_competitions', 'false');
    }

    // Handle pagination
    if (filters.limit !== undefined) {
      queryParams.append('limit', filters.limit.toString());
    }

    if (filters.offset !== undefined) {
      queryParams.append('offset', filters.offset.toString());
    }

    const endpoint = `/api/v1/competitions${queryParams.toString() ? '?' + queryParams : ''}`;
    console.log('🔍 [ApiCompetitionRepository.findPublic] Fetching public competitions from:', endpoint);

    const apiDataArray = await apiRequest(endpoint);

    // Map each API response to Competition domain entity
    const competitions = apiDataArray.map((apiData) => {
      const competition = CompetitionMapper.toDomain(apiData);
      competition._apiData = apiData;
      return competition;
    });

    console.log('✅ [ApiCompetitionRepository.findPublic] Found', competitions.length, 'public competitions');

    return competitions;
  }
}

export default ApiCompetitionRepository;
