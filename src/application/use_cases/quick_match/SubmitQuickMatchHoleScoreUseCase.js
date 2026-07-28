/**
 * Use Case: Submit Quick Match Hole Score
 *
 * Registers/updates the current user's own score for a hole (scorers only).
 */
class SubmitQuickMatchHoleScoreUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('SubmitQuickMatchHoleScoreUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId, holeNumber, score) {
    if (!quickMatchId || !holeNumber) {
      throw new Error('quickMatchId and holeNumber are required');
    }

    const result = await this.#quickMatchRepository.submitHoleScore(quickMatchId, holeNumber, score);
    return {
      holeNumber: result.hole_number,
      participantId: result.participant_id,
      score: result.score,
      recordedByParticipantId: result.recorded_by_participant_id,
    };
  }
}

export default SubmitQuickMatchHoleScoreUseCase;
