/**
 * Player Stats Repository Interface
 *
 * Resumen de rendimiento del jugador autenticado.
 */
class IPlayerStatsRepository {
  /**
   * Estadísticas del jugador autenticado
   * @returns {Promise<import('../entities/PlayerStats').default>}
   */
  async getPlayerStats() {
    throw new Error('Method not implemented: getPlayerStats');
  }

  /**
   * Historial de partidas del jugador autenticado
   * @param {number} [limit]
   * @returns {Promise<import('../entities/RecentMatch').default[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async getRecentMatches(limit) {
    throw new Error('Method not implemented: getRecentMatches');
  }

  /**
   * Estadísticas del jugador restringidas a un campo de golf
   * @param {string} golfCourseId
   * @returns {Promise<import('../entities/PlayerStats').default>}
   */
  // eslint-disable-next-line no-unused-vars
  async getPlayerStatsByGolfCourse(golfCourseId) {
    throw new Error('Method not implemented: getPlayerStatsByGolfCourse');
  }
}

export default IPlayerStatsRepository;
