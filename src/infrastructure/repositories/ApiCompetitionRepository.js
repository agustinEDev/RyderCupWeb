import { ICompetitionRepository } from '../../domain/repositories/ICompetitionRepository';
import Competition from '../../domain/entities/Competition';
import { getAuthToken } from '../../utils/secureAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiCompetitionRepository extends ICompetitionRepository {
  /**
   * Creates a new competition via the API.
   * @override
   * @param {Object} competitionData - The data for the new competition.
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

    // Map API response (snake_case) to what the UI needs
    // Note: We're NOT creating a full Competition entity because that would require
    // constructing all the Value Objects (Location, DateRange, HandicapSettings, etc.)
    // For now, we return a simple object with the essential fields
    return {
      id: apiData.id,
      name: apiData.name,
      team_one_name: apiData.team_one_name,
      team_two_name: apiData.team_two_name,
      start_date: apiData.start_date,
      end_date: apiData.end_date,
      status: apiData.status,
      creator_id: apiData.creator_id
    };
  }
}

export default ApiCompetitionRepository;
