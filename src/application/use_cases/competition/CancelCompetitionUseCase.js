import { getAuthToken } from '../../../utils/secureAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Use Case: Cancel Competition
 * Transitions competition from any state to CANCELLED state.
 * Only the creator can cancel a competition.
 */
class CancelCompetitionUseCase {
  /**
   * Executes the use case to cancel a competition.
   * @param {string} competitionId - The ID of the competition to cancel.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If cancellation fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const token = getAuthToken();

    if (!token) {
      throw new Error('Authentication required. Please login again.');
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/competitions/${competitionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          // JSON parsing failed, try to get text or use status
          try {
            const errorText = await response.text();
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
          } catch (textError) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(`Competition cancellation error: ${errorMessage}`);
      }

      const data = await response.json();

      // Return simple DTO for UI
      return {
        id: data.id,
        name: data.name,
        status: data.status,
        updatedAt: data.updated_at
      };
    } catch (error) {
      // If error already has our prefix, rethrow as-is
      if (error.message.startsWith('Competition cancellation error:')) {
        throw error;
      }
      // Wrap network errors and other unexpected errors
      throw new Error(`Competition cancellation error: ${error.message}`);
    }
  }
}

export default CancelCompetitionUseCase;
