import { getAuthToken, authenticatedFetch } from '../../../utils/secureAuth';

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

    if (!token) {
      throw new Error('Authentication required. Please login again.');
    }

    const response = await authenticatedFetch(`${API_URL}/api/v1/competitions/${competitionId}/start`, {
      method: 'POST',
      headers: {
        // Content-Type is already set to application/json by default in authenticatedFetch
        // No need to manually add Authorization header as authenticatedFetch handles it
      }
    });

    if (!response.ok) {
      const clonedResponse = response.clone();
      let errorDetail;

      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || 'No detail provided.';
      } catch (jsonError) {
        try {
          errorDetail = await clonedResponse.text();
        } catch (textError) {
          errorDetail = 'Could not read error response body.';
        }
      }

      throw new Error(`API Error (${response.status} ${response.statusText}): ${errorDetail || 'Empty response body'}`);
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
