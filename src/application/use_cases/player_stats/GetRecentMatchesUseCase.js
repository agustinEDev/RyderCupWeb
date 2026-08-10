/**
 * Use Case: Get Recent Matches
 *
 * Historial de partidas del jugador autenticado, de la más reciente a la más
 * antigua, mezclando torneo y partidas rápidas.
 */
class GetRecentMatchesUseCase {
  #playerStatsRepository;

  constructor({ playerStatsRepository }) {
    if (!playerStatsRepository) {
      throw new Error('GetRecentMatchesUseCase requires playerStatsRepository');
    }
    this.#playerStatsRepository = playerStatsRepository;
  }

  /**
   * @param {number} [limit] - Cuántas devolver como máximo
   */
  async execute(limit) {
    return this.#playerStatsRepository.getRecentMatches(limit);
  }
}

export default GetRecentMatchesUseCase;
