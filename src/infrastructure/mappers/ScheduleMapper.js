import { siViene } from '../../utils/campoSiViene';
import { aBloqueoDePartidos } from './MatchGenerationBlockMapper';

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
      // La suma de los cupos de las franjas de un stroke play (FE #824); null
      // en una Ryder
      teeSheetCapacity: apiData.tee_sheet_capacity ?? null,
    };
  }

  /**
   * La hoja de salidas de una franja (FE #824, RyderCupAm#508), o null en una
   * sesión de la Ryder. Las horas en «HH:MM»: el backend puede mandar segundos.
   */
  static toTeeSheetDTO(apiTeeSheet) {
    if (!apiTeeSheet) return null;
    const hhmm = (hora) => (typeof hora === 'string' ? hora.slice(0, 5) : hora);
    return {
      firstTeeTime: hhmm(apiTeeSheet.first_tee_time),
      lastTeeTime: hhmm(apiTeeSheet.last_tee_time),
      intervalMinutes: apiTeeSheet.interval_minutes,
      groupSize: apiTeeSheet.group_size,
      teeTimes: (apiTeeSheet.tee_times || []).map(hhmm),
      capacity: apiTeeSheet.capacity,
      placesTaken: apiTeeSheet.places_taken ?? 0,
      playerIds: apiTeeSheet.player_ids || [],
      waitingIds: apiTeeSheet.waiting_ids || [],
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
      // La hora a la que abre sola la anotacion de esta ronda, con el huso del
      // CAMPO dentro (BE #305). Viaja en la RONDA, no en cada partido. Y se
      // respeta la diferencia entre las dos ausencias, porque `sePuedeAnotar`
      // decide distinto con cada una: NULL es «este campo no tiene coordenadas
      // y no abre solo», y que no venga el campo es «este servidor es anterior
      // a la BE #305». Con `?? null` un frontend desplegado antes que su
      // backend dejaba TODO partido programado sin boton de anotar
      ...siViene(apiRound, 'scoring_opens_at', 'scoringOpensAt'),
      // Por qué no tiene partidos aunque sus sobres ya se abrieron (BE #361)
      matchGenerationBlock: aBloqueoDePartidos(apiRound.match_generation_block),
      // Quién de los equipos no juega ningún partido de la sesión (#710): el que
      // sobra con equipos desiguales. Un servidor anterior no lo manda
      restingPlayerIds: apiRound.resting_player_ids || [],
      sessionType: apiRound.session_type,
      matchFormat: apiRound.match_format,
      teeSheet: ScheduleMapper.toTeeSheetDTO(apiRound.tee_sheet),
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
  static toMatchPlayerDTO(p) {
    return {
      userId: p.user_id,
      playingHandicap: p.playing_handicap ?? null,
      color: p.color || null,
      teeGender: p.tee_gender || null,
      strokesReceived: p.strokes_received || [],
      playerHandicap: p.player_handicap ?? null,
    };
  }

  static toMatchDTO(apiMatch) {
    return {
      id: apiMatch.id,
      roundId: apiMatch.round_id,
      matchNumber: apiMatch.match_number,
      teamAPlayers: (apiMatch.team_a_players || []).map(ScheduleMapper.toMatchPlayerDTO),
      teamBPlayers: (apiMatch.team_b_players || []).map(ScheduleMapper.toMatchPlayerDTO),
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
