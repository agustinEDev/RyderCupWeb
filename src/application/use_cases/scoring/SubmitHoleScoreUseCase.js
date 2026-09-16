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

    // Omitir un golpe NO es lo mismo que mandarlo nulo (#609): nulo es una raya
    // —conceder el hoyo, en match play— y el backend la guarda como tal
    // (RyderCupAm#301). La casilla que el jugador no ha tocado llega como
    // `undefined`, y pasarla por `HoleScore` la convertia en `null`: asi se
    // concedia el hoyo del otro sin que nadie lo concediera, y su hoyo pasaba a
    // desacuerdo si ya habia anotado. Se valida y se manda solo lo que viene
    const aEnviar = { markedPlayerId: scoreData.markedPlayerId };
    if (scoreData.ownScore !== undefined) {
      aEnviar.ownScore = new HoleScore(scoreData.ownScore).getValue();
    }
    if (scoreData.markedScore !== undefined) {
      aEnviar.markedScore = new HoleScore(scoreData.markedScore).getValue();
    }

    return await this.scoringRepository.submitHoleScore(matchId, holeNumber, aEnviar);
  }
}

export default SubmitHoleScoreUseCase;
