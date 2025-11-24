import { getAuthToken } from '../../../utils/secureAuth';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Use Case: Close Enrollments
 * Transitions competition from ACTIVE to CLOSED state.
 * Only the creator can close enrollments.
 */
class CloseEnrollmentsUseCase {
  /**
   * Executes the use case to close enrollments for a competition.
   * @param {string} competitionId - The ID of the competition.
   * @returns {Promise<Object>} - Simple DTO with updated competition data.
   * @throws {Error} If closing enrollments fails or user is not authorized.
   */
  async execute(competitionId) {
    if (!competitionId) {
      throw new Error('Competition ID is required');
    }

    const token = getAuthToken();

    const response = await fetch(`${API_URL}/api/v1/competitions/${competitionId}/close-enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.detail || 'Failed to close enrollments';
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

export default CloseEnrollmentsUseCase;
