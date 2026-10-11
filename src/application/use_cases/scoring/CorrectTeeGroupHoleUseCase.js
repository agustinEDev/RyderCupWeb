import HoleScore from '../../../domain/value_objects/HoleScore.js';

/**
 * El organizador corrige un hoyo (FE #824, PR 7): el lado del jugador, el del
 * marcador o los dos. Como al anotar, lo que no viene no se manda y nulo es
 * recogida (en Medal lo rechaza el servidor).
 */
class CorrectTeeGroupHoleUseCase {
  constructor({ teeGroupScoringRepository }) {
    this.teeGroupScoringRepository = teeGroupScoringRepository;
  }

  async execute(groupId, userId, holeNumber, { ownScore, markerScore } = {}) {
    if (!groupId) throw new Error('Group ID is required');
    if (!userId) throw new Error('User ID is required');
    if (!holeNumber || holeNumber < 1 || holeNumber > 18) throw new Error('Hole number must be between 1 and 18');
    if (ownScore === undefined && markerScore === undefined) throw new Error('A score is required');
    const lados = {};
    if (ownScore !== undefined) lados.ownScore = new HoleScore(ownScore).getValue();
    if (markerScore !== undefined) lados.markerScore = new HoleScore(markerScore).getValue();
    return this.teeGroupScoringRepository.correctHole(groupId, userId, holeNumber, lados);
  }
}

export default CorrectTeeGroupHoleUseCase;
