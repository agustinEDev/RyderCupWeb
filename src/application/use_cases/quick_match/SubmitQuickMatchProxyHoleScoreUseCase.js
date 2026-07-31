/**
 * Use Case: Submit Quick Match Proxy Hole Score
 *
 * Records a hole score on behalf of another participant (guest, or a
 * registered player not selected as a scorer). Only the scorer assigned to
 * that participant may do this.
 */
class SubmitQuickMatchProxyHoleScoreUseCase {
  #quickMatchRepository;

  constructor({ quickMatchRepository }) {
    if (!quickMatchRepository) {
      throw new Error('SubmitQuickMatchProxyHoleScoreUseCase requires quickMatchRepository');
    }
    this.#quickMatchRepository = quickMatchRepository;
  }

  async execute(quickMatchId, targetParticipantId, holeNumber, score) {
    if (!quickMatchId || !targetParticipantId || !holeNumber) {
      throw new Error('quickMatchId, targetParticipantId and holeNumber are required');
    }

    const result = await this.#quickMatchRepository.submitProxyHoleScore(
      quickMatchId,
      targetParticipantId,
      holeNumber,
      score
    );
    return {
      holeNumber: result.hole_number,
      participantId: result.participant_id,
      score: result.score,
      recordedByParticipantId: result.recorded_by_participant_id,
    };
  }
}

export default SubmitQuickMatchProxyHoleScoreUseCase;
