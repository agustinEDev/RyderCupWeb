import apiRequest from '../../../services/api.js';

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

    const data = await apiRequest(`/api/v1/competitions/${competitionId}/activate`, {
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

export default ActivateCompetitionUseCase;
