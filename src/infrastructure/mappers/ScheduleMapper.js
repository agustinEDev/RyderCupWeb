// src/infrastructure/mappers/ScheduleMapper.js

/**
 * Mapper para convertir entre DTOs de la API y DTOs/Entities del dominio
 * para Schedule (Rondas, Partidos, Equipos).
 */
class ScheduleMapper {
  /**
   * Mapea respuesta de GET schedule a DTO para la UI.
   * @param {Object} apiData - Respuesta de GET /competitions/{id}/schedule
   * @returns {Object} Schedule DTO
   */
  static toScheduleDTO(apiData) {
    // Backend returns { days: [{ date, rounds: [...] }, ...] }
    // Flatten all rounds from all days into a single array
    const allRounds = (apiData.days || []).flatMap(day =>
      (day.rounds || []).map(round => ScheduleMapper.toRoundDTO(round))
    );

    return {
      competitionId: apiData.competition_id,
      teamAssignment: apiData.team_assignment ? {
        mode: apiData.team_assignment.mode,
        teamAPlayerIds: apiData.team_assignment.team_a_player_ids || [],
        teamBPlayerIds: apiData.team_assignment.team_b_player_ids || [],
      } : null,
      rounds: allRounds,
    };
  }

  /**
   * Mapea una ronda individual de la API a DTO.
   * @param {Object} apiRound - Ronda de la API (snake_case)
   * @returns {Object} Round DTO (camelCase)
   */
  static toRoundDTO(apiRound) {
    return {
      id: apiRound.id,
      competitionId: apiRound.competition_id,
      golfCourseId: apiRound.golf_course_id,
      golfCourseName: apiRound.golf_course_name || null,
      roundDate: apiRound.round_date || apiRound.date,
      sessionType: apiRound.session_type,
      matchFormat: apiRound.match_format,
      handicapMode: apiRound.handicap_mode || null,
      allowancePercentage: apiRound.allowance_percentage ?? null,
      effectiveAllowance: apiRound.effective_allowance ?? null,
      status: apiRound.status,
      matches: (apiRound.matches || []).map(match => ScheduleMapper.toMatchDTO(match)),
      createdAt: apiRound.created_at,
      updatedAt: apiRound.updated_at,
    };
  }

  /**
   * Mapea un partido individual de la API a DTO.
   * @param {Object} apiMatch - Partido de la API (snake_case)
   * @returns {Object} Match DTO (camelCase)
   */
  static toMatchDTO(apiMatch) {
    return {
      id: apiMatch.id,
      roundId: apiMatch.round_id,
      matchNumber: apiMatch.match_number,
      teamAPlayers: (apiMatch.team_a_players || []).map(p => ({
        userId: p.user_id,
        playingHandicap: p.playing_handicap ?? null,
        teeCategory: p.tee_category || null,
        teeGender: p.tee_gender || null,
        strokesReceived: p.strokes_received || [],
      })),
      teamBPlayers: (apiMatch.team_b_players || []).map(p => ({
        userId: p.user_id,
        playingHandicap: p.playing_handicap ?? null,
        teeCategory: p.tee_category || null,
        teeGender: p.tee_gender || null,
        strokesReceived: p.strokes_received || [],
      })),
      status: apiMatch.status,
      handicapStrokesGiven: apiMatch.handicap_strokes_given ?? null,
      strokesGivenToTeam: apiMatch.strokes_given_to_team || null,
      result: apiMatch.result || null,
      createdAt: apiMatch.created_at,
      updatedAt: apiMatch.updated_at,
    };
  }

  /**
   * Mapea asignacion de equipos de la API a DTO.
   * @param {Object} apiTeams - Respuesta de POST /competitions/{id}/teams
   * @returns {Object} TeamAssignment DTO
   */
  static toTeamAssignmentDTO(apiTeams) {
    return {
      id: apiTeams.id,
      competitionId: apiTeams.competition_id,
      mode: apiTeams.mode,
      teamAPlayerIds: apiTeams.team_a_player_ids || [],
      teamBPlayerIds: apiTeams.team_b_player_ids || [],
      createdAt: apiTeams.created_at,
    };
  }

}

export default ScheduleMapper;
