import HoleScore from '../../../domain/value_objects/HoleScore.js';

class SubmitHoleScoreUseCase {
  constructor({ scoringRepository }) {
    this.scoringRepository = scoringRepository;
  }

  async execute(matchId, holeNumber, scoreData) {
    if (!matchId) {
      throw new Error('Match ID is required');
    }
    if (!holeNumber || holeNumber < 1 || holeNumber > 18) {
      throw new Error('Hole number must be between 1 and 18');
    }
    if (!scoreData) {
      throw new Error('Score data is required');
    }
    if (!scoreData.markedPlayerId) {
      throw new Error('Marked player ID is required');
    }

    // Validate scores using HoleScore VO
    const ownScore = new HoleScore(scoreData.ownScore);
    const markedScore = new HoleScore(scoreData.markedScore);

    return await this.scoringRepository.submitHoleScore(matchId, holeNumber, {
      ownScore: ownScore.getValue(),
      markedPlayerId: scoreData.markedPlayerId,
      markedScore: markedScore.getValue(),
    });
  }
}

export default SubmitHoleScoreUseCase;
