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
}

export default IPlayerStatsRepository;
