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

    const createdCompetitionData = await response.json();
    return new Competition(createdCompetitionData);
  }
}

export default ApiCompetitionRepository;
