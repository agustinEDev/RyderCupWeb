import QuickMatch from '../../domain/entities/QuickMatch';
import QuickMatchStatus from '../../domain/value_objects/QuickMatchStatus';

/**
 * QuickMatchMapper - Anti-Corruption Layer
 *
 * Converts API DTOs (snake_case) -> Domain Entities (camelCase).
 * Handles both the base response (creation/actions) and the detail response
 * (hole scores + standing + scoring assignments), since the latter simply
 * adds optional fields on top of the former.
 */
class QuickMatchMapper {
  /**
   * Convert an API DTO to a domain entity
   *
   * @param {Object} apiData - API response data (snake_case)
   * @returns {QuickMatch} Domain entity
   */
  static toDomain(apiData) {
    if (!apiData) {
      throw new Error('QuickMatchMapper.toDomain: apiData is required');
    }

    if (!apiData.id || !apiData.creator_id || !apiData.golf_course_id || !apiData.status) {
      throw new Error(
        'QuickMatchMapper.toDomain: Missing required fields (id, creator_id, golf_course_id, status)'
      );
    }

    const participants = (apiData.participants || []).map((p) => ({
      participantId: p.participant_id,
      userId: p.user_id ?? null,
      name: p.name,
      handicap: p.handicap ?? null,
      team: p.team ?? null,
      isGuest: !!p.is_guest,
      // La API lo llama `tee_color`; el dominio, `color`. Leerlo de `p.color`
      // dejaba la salida siempre en null, y con ella nula
      // `StablefordCalculator.resolveStrokesBasis` devuelve el hándicap bruto
      // en vez del de juego: las tarjetas repartían golpes sin ajustar por
      // slope, course rating ni allowance.
      color: p.tee_color ?? null,
      teeGender: p.tee_gender ?? null,
    }));

    const holeScores = (apiData.hole_scores || []).map((hs) => ({
      holeNumber: hs.hole_number,
      participantId: hs.participant_id,
      score: hs.score,
      recordedByParticipantId: hs.recorded_by_participant_id,
    }));

    const standing = apiData.standing
      ? {
          status: apiData.standing.status,
          leadingTeam: apiData.standing.leading_team ?? null,
          holesPlayed: apiData.standing.holes_played,
          holesRemaining: apiData.standing.holes_remaining,
          isDecided: !!apiData.standing.is_decided,
        }
      : null;

    // Los golpes que el backend ha usado para decidir cada hoyo. Solo vienen en
    // el detalle; en la respuesta base la lista llega vacía y el reparto se
    // recalcula en el cliente (que es lo que permite anotar sin conexión).
    const participantStrokes = (apiData.participant_strokes || []).map((ps) => ({
      participantId: ps.participant_id,
      playingHandicap: ps.playing_handicap,
      // Número de hoyo -> golpes, con signo: negativo si los cede (hándicap plus).
      // Las claves llegan como texto en JSON; se normalizan a número para poder
      // indexar por `holeNumber` sin convertir en cada consulta.
      strokesByHole: Object.fromEntries(
        Object.entries(ps.strokes_by_hole || {}).map(([hole, count]) => [Number(hole), count])
      ),
    }));

    const scoringAssignments = (apiData.scoring_assignments || []).map((sa) => ({
      scorerParticipantId: sa.scorer_participant_id,
      scorerName: sa.scorer_name,
      coveredParticipantIds: sa.covered_participant_ids || [],
    }));

    return QuickMatch.fromPersistence({
      id: apiData.id,
      creatorId: apiData.creator_id,
      golfCourseId: apiData.golf_course_id,
      matchFormat: apiData.match_format ?? null,
      scoringFormat: apiData.scoring_format ?? null,
      allowancePercentage: apiData.allowance_percentage ?? null,
      effectiveAllowance: apiData.effective_allowance ?? 100,
      playMode: apiData.play_mode ?? 'HANDICAP',
      status: QuickMatchStatus.fromString(apiData.status),
      name: apiData.name ?? null,
      participants,
      scorerIds: apiData.scorer_ids || [],
      holeScores,
      standing,
      scoringAssignments,
      participantStrokes,
      createdAt: apiData.created_at,
      updatedAt: apiData.updated_at,
    });
  }

  /**
   * Convert multiple API DTOs to domain entities
   *
   * @param {Array<Object>} apiDataArray - Array of API response data
   * @returns {Array<QuickMatch>} Array of domain entities
   */
  static toDomainMany(apiDataArray) {
    if (!Array.isArray(apiDataArray)) {
      throw new Error('QuickMatchMapper.toDomainMany: apiDataArray must be an array');
    }

    return apiDataArray.map((apiData) => QuickMatchMapper.toDomain(apiData));
  }
}

export default QuickMatchMapper;
