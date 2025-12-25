import apiRequest from '../../../services/api.js';

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

    const data = await apiRequest(`/api/v1/competitions/${competitionId}/cancel`, {
      method: 'POST'
    });

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
