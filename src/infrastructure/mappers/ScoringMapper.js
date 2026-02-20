// src/infrastructure/mappers/ScoringMapper.js

/**
 * Mapper for converting between API DTOs (snake_case) and
 * frontend DTOs (camelCase) for Scoring.
 *
 * Follows the same pattern as ScheduleMapper:
 * - Static methods only
 * - Returns plain DTOs (no domain entities)
 * - Null-safe with sensible defaults
 */
class ScoringMapper {
  /**
   * Maps GET /matches/{id}/scoring-view response to camelCase DTO.
   * @param {Object} apiData - API response (snake_case)
   * @returns {Object} ScoringView DTO (camelCase)
   */
  static toScoringViewDTO(apiData) {
    return {
      matchId: apiData.match_id,
      matchNumber: apiData.match_number,
      matchFormat: apiData.match_format,
      matchStatus: apiData.match_status,
      isDecided: apiData.is_decided || false,
      decidedResult: apiData.decided_result
        ? {
          winner: apiData.decided_result.winner,
          score: apiData.decided_result.score,
        }
        : null,
      roundInfo: apiData.round_info
        ? {
          id: apiData.round_info.id,
          date: apiData.round_info.date,
          sessionType: apiData.round_info.session_type,
          golfCourseName: apiData.round_info.golf_course_name,
        }
        : null,
      competitionId: apiData.competition_id,
      teamAName: apiData.team_a_name,
      teamBName: apiData.team_b_name,
      markerAssignments: (apiData.marker_assignments || []).map(ma => ({
        scorerUserId: ma.scorer_user_id,
        scorerName: ma.scorer_name,
        marksUserId: ma.marks_user_id,
        marksName: ma.marks_name,
        markedByUserId: ma.marked_by_user_id,
        markedByName: ma.marked_by_name,
      })),
      players: (apiData.players || []).map(p => ({
        userId: p.user_id,
        userName: p.user_name,
        team: p.team,
        teeCategory: p.tee_category,
        playingHandicap: p.playing_handicap,
        strokesReceived: p.strokes_received || [],
      })),
      holes: (apiData.holes || []).map(h => ({
        holeNumber: h.hole_number,
        par: h.par,
        strokeIndex: h.stroke_index,
      })),
      scores: (apiData.scores || []).map(s => ({
        holeNumber: s.hole_number,
        playerScores: (s.player_scores || []).map(ps => ({
          userId: ps.user_id,
          ownScore: ps.own_score ?? null,
          markerScore: ps.marker_score ?? null,
          validationStatus: ps.validation_status || 'pending',
          netScore: ps.net_score ?? null,
          strokesReceivedThisHole: ps.strokes_received_this_hole ?? 0,
        })),
        holeResult: s.hole_result
          ? {
            winner: s.hole_result.winner,
            standing: s.hole_result.standing,
            standingTeam: s.hole_result.standing_team,
          }
          : null,
      })),
      matchStanding: apiData.match_standing
        ? {
          status: apiData.match_standing.status,
          leadingTeam: apiData.match_standing.leading_team,
          holesPlayed: apiData.match_standing.holes_played,
          holesRemaining: apiData.match_standing.holes_remaining,
        }
        : null,
      scorecardSubmittedBy: apiData.scorecard_submitted_by || [],
    };
  }

  /**
   * Maps GET /competitions/{id}/leaderboard response to camelCase DTO.
   * @param {Object} apiData - API response (snake_case)
   * @returns {Object} Leaderboard DTO (camelCase)
   */
  static toLeaderboardDTO(apiData) {
    return {
      competitionId: apiData.competition_id,
      competitionName: apiData.competition_name,
      teamAName: apiData.team_a_name,
      teamBName: apiData.team_b_name,
      teamAPoints: apiData.team_a_points ?? 0,
      teamBPoints: apiData.team_b_points ?? 0,
      matches: (apiData.matches || []).map(m => ({
        matchId: m.match_id,
        matchNumber: m.match_number,
        matchFormat: m.match_format,
        status: m.status,
        currentHole: m.current_hole ?? null,
        standing: m.standing ?? null,
        leadingTeam: m.leading_team ?? null,
        teamAPlayers: (m.team_a_players || []).map(p => ({
          userId: p.user_id,
          userName: p.user_name,
        })),
        teamBPlayers: (m.team_b_players || []).map(p => ({
          userId: p.user_id,
          userName: p.user_name,
        })),
        result: m.result
          ? {
            winner: m.result.winner,
            score: m.result.score,
          }
          : null,
      })),
    };
  }

  /**
   * Maps POST /matches/{id}/scorecard/submit response to camelCase DTO.
   * @param {Object} apiData - API response (snake_case)
   * @returns {Object} MatchSummary DTO (camelCase)
   */
  static toMatchSummaryDTO(apiData) {
    return {
      matchId: apiData.match_id,
      submittedBy: apiData.submitted_by,
      result: apiData.result
        ? {
          winner: apiData.result.winner,
          score: apiData.result.score,
          teamAPoints: apiData.result.team_a_points ?? 0,
          teamBPoints: apiData.result.team_b_points ?? 0,
        }
        : null,
      stats: apiData.stats
        ? {
          playerGrossTotal: apiData.stats.player_gross_total,
          playerNetTotal: apiData.stats.player_net_total,
          holesWon: apiData.stats.holes_won,
          holesLost: apiData.stats.holes_lost,
          holesHalved: apiData.stats.holes_halved,
        }
        : null,
      matchComplete: apiData.match_complete || false,
    };
  }
}

export default ScoringMapper;
