import RecentMatch from '../../domain/entities/RecentMatch';

/**
 * RecentMatchMapper - Anti-Corruption Layer
 *
 * Convierte las entradas del historial (snake_case) en entidades de dominio.
 */
class RecentMatchMapper {
  /**
   * @param {Object} apiData - Entrada de la API (snake_case)
   * @returns {RecentMatch}
   */
  static toDomain(apiData) {
    if (!apiData) {
      throw new Error('RecentMatchMapper.toDomain: apiData is required');
    }
    if (!apiData.id) {
      throw new Error('RecentMatchMapper.toDomain: Missing required field (id)');
    }

    return RecentMatch.fromPersistence({
      id: apiData.id,
      date: apiData.date ?? null,
      matchFormat: apiData.match_format ?? null,
      scoringFormat: apiData.scoring_format ?? null,
      golfCourseId: apiData.golf_course_id ?? null,
      golfCourseName: apiData.golf_course_name ?? null,
      tournamentName: apiData.tournament_name ?? null,
      excludedFromStats: apiData.excluded_from_stats ?? false,
      result: apiData.result ?? null,
      score: apiData.score ?? null,
      stablefordPoints: apiData.stableford_points ?? null,
      totalStrokes: apiData.total_strokes ?? null,
      holesPlayed: apiData.holes_played ?? null,
      partners: Array.isArray(apiData.partners) ? apiData.partners : [],
      opponents: Array.isArray(apiData.opponents) ? apiData.opponents : [],
    });
  }

  /**
   * @param {Array} apiList
   * @returns {RecentMatch[]}
   */
  static toDomainList(apiList) {
    if (!Array.isArray(apiList)) {
      return [];
    }
    return apiList.map((item) => RecentMatchMapper.toDomain(item));
  }
}

export default RecentMatchMapper;
