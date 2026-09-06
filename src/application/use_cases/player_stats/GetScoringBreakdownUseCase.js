/**
 * Use Case: Get Scoring Breakdown
 *
 * Dónde gana y dónde pierde los golpes el jugador autenticado: por par de hoyo,
 * por mitad de vuelta y por campo (FE #592, RyderCupAm#168).
 *
 * Va aparte del resumen porque son bastantes datos y no todas las pantallas los
 * necesitan; mide sobre las mismas vueltas que la media.
 */
class GetScoringBreakdownUseCase {
  #playerStatsRepository;

  constructor({ playerStatsRepository }) {
    if (!playerStatsRepository) {
      throw new Error('GetScoringBreakdownUseCase requires playerStatsRepository');
    }
    this.#playerStatsRepository = playerStatsRepository;
  }

  async execute() {
    return this.#playerStatsRepository.getScoringBreakdown();
  }
}

export default GetScoringBreakdownUseCase;
