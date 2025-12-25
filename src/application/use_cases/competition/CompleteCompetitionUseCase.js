const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Use Case: Complete Competition
 * Transitions competition from IN_PROGRESS to COMPLETED state.
 * Only the creator can complete a competition.
 */
class CompleteCompetitionUseCase {
  /**
   * Executes the use case to complete a competition.
   * @param {string} competitionId - The ID of the competition to complete.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If completion fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const response = await fetch(`${API_URL}/api/v1/competitions/${competitionId}/complete`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorMessage = 'Failed to complete competition';
      try {
        const errorData = await response.json();
        if (errorData && errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (e) {
        // The response body is not valid JSON.
        // The failed call to response.json() has already consumed the body.
        // We will use the generic error message.
      }
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

export default CompleteCompetitionUseCase;
