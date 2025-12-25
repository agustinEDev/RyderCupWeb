import apiRequest from '../../../services/api.js';

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

    const data = await apiRequest(`/api/v1/competitions/${competitionId}/close-enrollments`, {
      method: 'POST'
    });

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
