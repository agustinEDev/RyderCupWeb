import { ICompetitionRepository } from '../../domain/repositories/ICompetitionRepository';
import CompetitionMapper from '../mappers/CompetitionMapper';
import { getAuthToken } from '../../utils/secureAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiCompetitionRepository extends ICompetitionRepository {
  /**
   * Creates a new competition via the API.
   * @override
   * @param {Object} competitionData - The data for the new competition (API DTO format).
   * @returns {Promise<Competition>} - The newly created competition entity.
   */
  async save(competitionData) {
    const token = getAuthToken();

    const response = await fetch(`${API_URL}/api/v1/competitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(competitionData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.detail || 'Failed to create competition';
      throw new Error(errorMessage);
    }

    const apiData = await response.json();

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
    const token = getAuthToken();

    const response = await fetch(`${API_URL}/api/v1/competitions/${competitionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Competition not found');
      }
      const errorData = await response.json();
      const errorMessage = errorData.detail || 'Failed to fetch competition';
      throw new Error(errorMessage);
    }

    const apiData = await response.json();

    // Map API response to Competition domain entity
    const competition = CompetitionMapper.toDomain(apiData);

    // Attach original API data for mapper to use (for location names, etc.)
    competition._apiData = apiData;

    return competition;
  }

  /**
   * Finds all competitions for a specific user (creator).
   * @override
   * @param {string} userId - The ID of the user/creator.
   * @param {object} filters - Optional filters (status, etc.)
   * @returns {Promise<Competition[]>} - Array of competition entities.
   */
  async findByCreator(userId, filters = {}) {
    const token = getAuthToken();

    // Build query parameters
    // Note: Backend automatically filters by authenticated user from JWT token
    // No need to send creator_id explicitly
    const queryParams = new URLSearchParams(filters);

    const url = `${API_URL}/api/v1/competitions${queryParams.toString() ? '?' + queryParams : ''}`;
    console.log('🔍 [ApiCompetitionRepository.findByCreator] Fetching competitions from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('❌ [ApiCompetitionRepository.findByCreator] HTTP Error:', response.status, response.statusText);

      let errorMessage = 'Failed to fetch competitions';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
        console.error('❌ [ApiCompetitionRepository.findByCreator] Error details:', errorData);
      } catch (parseError) {
        console.error('❌ [ApiCompetitionRepository.findByCreator] Could not parse error response');
      }

      // Add more context for 500 errors
      if (response.status === 500) {
        errorMessage = 'Server error while fetching competitions. Please check the backend logs.';
      }

      throw new Error(errorMessage);
    }

    const apiDataArray = await response.json();

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
    const token = getAuthToken();

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

    const url = `${API_URL}/api/v1/competitions${queryParams.toString() ? '?' + queryParams : ''}`;
    console.log('🔍 [ApiCompetitionRepository.findPublic] Fetching public competitions from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('❌ [ApiCompetitionRepository.findPublic] HTTP Error:', response.status, response.statusText);

      let errorMessage = 'Failed to fetch public competitions';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
        console.error('❌ [ApiCompetitionRepository.findPublic] Error details:', errorData);
      } catch (parseError) {
        console.error('❌ [ApiCompetitionRepository.findPublic] Could not parse error response');
      }

      if (response.status === 500) {
        errorMessage = 'Server error while fetching public competitions. Please check the backend logs.';
      }

      throw new Error(errorMessage);
    }

    const apiDataArray = await response.json();

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
