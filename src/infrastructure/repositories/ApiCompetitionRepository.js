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
    const queryParams = new URLSearchParams({
      creator_id: userId,
      ...filters
    });

    const response = await fetch(`${API_URL}/api/v1/competitions?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.detail || 'Failed to fetch competitions';
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
}

export default ApiCompetitionRepository;
