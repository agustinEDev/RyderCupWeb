/**
 * Use Case: Get Player Stats By Golf Course
 *
 * Las mismas estadísticas, restringidas a un campo. Los contadores de torneos
 * vienen a cero a propósito desde el backend: son globales del jugador y
 * repetirlos dentro de un desglose por campo induciría a error.
 */
class GetPlayerStatsByGolfCourseUseCase {
  #playerStatsRepository;

  constructor({ playerStatsRepository }) {
    if (!playerStatsRepository) {
      throw new Error('GetPlayerStatsByGolfCourseUseCase requires playerStatsRepository');
    }
    this.#playerStatsRepository = playerStatsRepository;
  }

  async execute(golfCourseId) {
    if (!golfCourseId) {
      throw new Error('GetPlayerStatsByGolfCourseUseCase requires a golfCourseId');
    }
    return this.#playerStatsRepository.getPlayerStatsByGolfCourse(golfCourseId);
  }
}

export default GetPlayerStatsByGolfCourseUseCase;
