// src/domain/repositories/ITeeGroupScoringRepository.js

/**
 * Anotar las partidas de stroke play (FE #824, PR 7). Las tres primeras
 * operaciones se llaman como las de `IScoringRepository`: así sirven los
 * mismos casos de uso de la Ryder (leer la vista, anotar un hoyo, entregar).
 *
 * Implementación: ApiTeeGroupScoringRepository.
 */

/* eslint-disable no-unused-vars */

class ITeeGroupScoringRepository {
  async getScoringView(groupId) {
    throw new Error('ITeeGroupScoringRepository.getScoringView must be implemented');
  }

  async submitHoleScore(groupId, holeNumber, scoreData) {
    throw new Error('ITeeGroupScoringRepository.submitHoleScore must be implemented');
  }

  async submitScorecard(groupId) {
    throw new Error('ITeeGroupScoringRepository.submitScorecard must be implemented');
  }

  async retire(groupId) {
    throw new Error('ITeeGroupScoringRepository.retire must be implemented');
  }

  async correctHole(groupId, userId, holeNumber, lados) {
    throw new Error('ITeeGroupScoringRepository.correctHole must be implemented');
  }

  async reopenCard(groupId, userId) {
    throw new Error('ITeeGroupScoringRepository.reopenCard must be implemented');
  }

  async markNoShow(groupId, userId) {
    throw new Error('ITeeGroupScoringRepository.markNoShow must be implemented');
  }

  async validateScored(groupId, userId) {
    throw new Error('ITeeGroupScoringRepository.validateScored must be implemented');
  }

  async closeWindow(roundId) {
    throw new Error('ITeeGroupScoringRepository.closeWindow must be implemented');
  }

  async getWindowStandings(roundId, category) {
    throw new Error('ITeeGroupScoringRepository.getWindowStandings must be implemented');
  }

  async getCompetitionStandings(competitionId, category) {
    throw new Error('ITeeGroupScoringRepository.getCompetitionStandings must be implemented');
  }

  async getScratchStandings(competitionId) {
    throw new Error('ITeeGroupScoringRepository.getScratchStandings must be implemented');
  }
}

export default ITeeGroupScoringRepository;
