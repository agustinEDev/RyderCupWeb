/**
 * Use Case: Get Player Stats
 *
 * Resumen de rendimiento del jugador autenticado, para el panel.
 */
class GetPlayerStatsUseCase {
  #playerStatsRepository;

  constructor({ playerStatsRepository }) {
    if (!playerStatsRepository) {
      throw new Error('GetPlayerStatsUseCase requires playerStatsRepository');
    }
    this.#playerStatsRepository = playerStatsRepository;
  }

  async execute() {
    return this.#playerStatsRepository.getPlayerStats();
  }
}

export default GetPlayerStatsUseCase;
