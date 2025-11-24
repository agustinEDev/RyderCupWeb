import { getAuthToken } from '../../../utils/secureAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Use Case: Start Competition
 * Transitions competition from CLOSED to IN_PROGRESS state.
 * Only the creator can start a competition.
 */
class StartCompetitionUseCase {
  /**
   * Executes the use case to start a competition.
   * @param {string} competitionId - The ID of the competition to start.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If starting fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const token = getAuthToken();

    const response = await fetch(`${API_URL}/api/v1/competitions/${competitionId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.detail || 'Failed to start competition';
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Return simple DTO for UI
    return {
      id: data.id,
      name: data.name,
      status: data.status,
      updatedAt: data.updated_at
    };
  }
}

export default StartCompetitionUseCase;
