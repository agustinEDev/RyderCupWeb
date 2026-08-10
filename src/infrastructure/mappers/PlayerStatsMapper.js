import PlayerStats from '../../domain/entities/PlayerStats';

/**
 * PlayerStatsMapper - Anti-Corruption Layer
 *
 * Convierte el DTO de la API (snake_case) en la entidad de dominio (camelCase).
 *
 * El detalle que importa aquí es **no confundir null con cero**. La respuesta
 * trae null en casi todo para una cuenta nueva, y un `?? 0` de más convertiría
 * "todavía no hay datos" en "su media es 0", que en golf además sería un
 * resultado extraordinario. Solo los contadores tienen cero por defecto,
 * porque ahí el cero sí es la respuesta correcta.
 */
class PlayerStatsMapper {
  /**
   * @param {Object} apiData - Respuesta de la API (snake_case)
   * @returns {PlayerStats}
   */
  static toDomain(apiData) {
    if (!apiData) {
      throw new Error('PlayerStatsMapper.toDomain: apiData is required');
    }

    return PlayerStats.fromPersistence({
      handicap: apiData.handicap ?? null,
      handicapTrend: apiData.handicap_trend ?? null,
      scoringAvg: apiData.scoring_avg ?? null,
      roundsPlayed: apiData.rounds_played ?? 0,
      tournamentsTotal: apiData.tournaments_total ?? 0,
      tournamentsActive: apiData.tournaments_active ?? 0,
      estimatedIndex: apiData.estimated_index ?? null,
      playingAvg: apiData.playing_avg ?? null,
      bestDifferential: apiData.best_differential ?? null,
      roundsWithDifferential: apiData.rounds_with_differential ?? 0,
      differentials: Array.isArray(apiData.differentials) ? apiData.differentials : [],
    });
  }
}

export default PlayerStatsMapper;
