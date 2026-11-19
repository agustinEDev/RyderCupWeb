// src/domain/repositories/ITeeGroupScoringRepository.js

/**
 * Anotar las partidas de stroke play (FE #824, PR 7). Las tres primeras
 * operaciones se llaman como las de `IScoringRepository`: así sirven los
 * mismos casos de uso de la Ryder (leer la vista, anotar un hoyo, entregar).
 *
 * Implementación: ApiTeeGroupScoringRepository.
 */

class ITeeGroupScoringRepository {
  /** @returns {Promise<Object>} La vista de anotar de la partida, como queda */
  async getScoringView(groupId) {
    throw new Error(
      'ITeeGroupScoringRepository.getScoringView must be implemented',
    );
  }

  /** @returns {Promise<Object>} La vista de anotar de la partida, como queda */
  async submitHoleScore(groupId, holeNumber, scoreData) {
    throw new Error(
      'ITeeGroupScoringRepository.submitHoleScore must be implemented',
    );
  }

  /** @returns {Promise<Object>} La vista de anotar de la partida, como queda */
  async submitScorecard(groupId) {
    throw new Error(
      'ITeeGroupScoringRepository.submitScorecard must be implemented',
    );
  }

  /** @returns {Promise<Object>} La vista de anotar de la partida, como queda */
  async retire(groupId) {
    throw new Error('ITeeGroupScoringRepository.retire must be implemented');
  }

  /** @returns {Promise<Object>} La vista de anotar de la partida, como queda */
  async correctHole(groupId, userId, holeNumber, lados) {
    throw new Error(
      'ITeeGroupScoringRepository.correctHole must be implemented',
    );
  }

  /** @returns {Promise<Object>} La vista de anotar de la partida, como queda */
  async reopenCard(groupId, userId) {
    throw new Error(
      'ITeeGroupScoringRepository.reopenCard must be implemented',
    );
  }

  /** @returns {Promise<Object>} La vista de anotar de la partida, como queda */
  async markNoShow(groupId, userId) {
    throw new Error(
      'ITeeGroupScoringRepository.markNoShow must be implemented',
    );
  }

  /** @returns {Promise<Object>} La vista de anotar de la partida, como queda */
  async retirePlayer(groupId, userId) {
    throw new Error(
      'ITeeGroupScoringRepository.retirePlayer must be implemented',
    );
  }

  /** @returns {Promise<Object>} La vista de anotar de la partida, como queda */
  async deleteHole(groupId, userId, holeNumber, side) {
    throw new Error(
      'ITeeGroupScoringRepository.deleteHole must be implemented',
    );
  }

  /** @returns {Promise<Object>} La vista de anotar de la partida, como queda */
  async validateScored(groupId, userId) {
    throw new Error(
      'ITeeGroupScoringRepository.validateScored must be implemented',
    );
  }

  /** @returns {Promise<Object>} Las partidas de la franja, como quedan */
  async closeWindow(roundId) {
    throw new Error(
      'ITeeGroupScoringRepository.closeWindow must be implemented',
    );
  }

  /** @returns {Promise<Object>} La clasificación de la franja */
  async getWindowStandings(roundId, category) {
    throw new Error(
      'ITeeGroupScoringRepository.getWindowStandings must be implemented',
    );
  }

  /** @returns {Promise<Object>} La general de la competición */
  async getCompetitionStandings(competitionId, category) {
    throw new Error(
      'ITeeGroupScoringRepository.getCompetitionStandings must be implemented',
    );
  }

  /** @returns {Promise<Object>} La clasificación scratch */
  async getScratchStandings(competitionId) {
    throw new Error(
      'ITeeGroupScoringRepository.getScratchStandings must be implemented',
    );
  }
}

export default ITeeGroupScoringRepository;
