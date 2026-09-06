/**
 * ScoringBreakdownMapper - Anti-Corruption Layer
 *
 * Convierte el desglose de golpes (snake_case) en la forma que usa la pantalla.
 *
 * Aquí el detalle que importa es el mismo que en `PlayerStatsMapper` y uno más:
 *
 * - **null no es cero.** `back_nine` viene a null cuando el jugador solo jugó
 *   la ida, y un `?? 0` lo convertiría en "jugó la vuelta al par", que es un
 *   resultado extraordinario en vez de una ausencia.
 * - **`byPar` trae solo los pares que se jugaron.** No se completa a 3-4-5:
 *   existen hoyos par 6 y un pitch & putt es todo par 3, así que rellenar
 *   inventaría filas y escondería las reales.
 */

const aDistribucion = (dto) => ({
  birdieOrBetter: dto?.birdie_or_better ?? 0,
  par: dto?.par ?? 0,
  bogey: dto?.bogey ?? 0,
  doubleOrWorse: dto?.double_or_worse ?? 0,
  holes: dto?.holes ?? 0,
});

// null cuando esa mitad no se jugó: la pantalla lo dice, no lo pinta como cero
const aMitad = (dto) =>
  dto ? { holes: dto.holes ?? 0, averageToPar: dto.average_to_par ?? null } : null;

class ScoringBreakdownMapper {
  /**
   * @param {Object} apiData - Respuesta de GET /users/me/stats/breakdown
   * @returns {Object} Desglose en camelCase
   */
  static toDomain(apiData) {
    if (!apiData) {
      throw new Error('ScoringBreakdownMapper.toDomain: apiData is required');
    }

    return {
      holesCounted: apiData.holes_counted ?? 0,
      roundsCounted: apiData.rounds_counted ?? 0,
      grossDistribution: aDistribucion(apiData.gross_distribution),
      netDistribution: aDistribucion(apiData.net_distribution),
      byPar: (apiData.by_par || []).map((entrada) => ({
        par: entrada.par,
        holes: entrada.holes ?? 0,
        averageToPar: entrada.average_to_par ?? null,
      })),
      frontNine: aMitad(apiData.front_nine),
      backNine: aMitad(apiData.back_nine),
      byCourse: (apiData.by_course || []).map((entrada) => ({
        golfCourseId: entrada.golf_course_id,
        golfCourseName: entrada.golf_course_name ?? null,
        rounds: entrada.rounds ?? 0,
        averageToPar: entrada.average_to_par ?? null,
      })),
    };
  }
}

export default ScoringBreakdownMapper;
