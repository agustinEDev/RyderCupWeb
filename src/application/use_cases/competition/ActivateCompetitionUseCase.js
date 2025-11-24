import { getAuthToken } from '../../../utils/secureAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Use Case: Activate Competition
 * Transitions competition from DRAFT to ACTIVE state.
 * Only the creator can activate a competition.
 */
class ActivateCompetitionUseCase {
  /**
   * Executes the use case to activate a competition.
   * @param {string} competitionId - The ID of the competition to activate.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If activation fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required. Please login again.');
    }

    const response = await fetch(`${API_URL}/api/v1/competitions/${competitionId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || 'Failed to activate competition';
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

export default ActivateCompetitionUseCase;
