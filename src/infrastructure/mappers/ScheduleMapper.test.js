import { describe, it, expect } from 'vitest';
import ScheduleMapper from './ScheduleMapper';

describe('ScheduleMapper', () => {
  describe('toRoundDTO', () => {
    it('should map API round to camelCase DTO', () => {
      const apiRound = {
        id: 'round-1',
        competition_id: 'comp-1',
        golf_course_id: 'gc-1',
        golf_course_name: 'Club de Golf',
        date: '2025-06-15',
        session_type: 'MORNING',
        match_format: 'FOURBALL',
        handicap_mode: 'MATCH_PLAY',
        allowance_percentage: 90,
        effective_allowance: 90,
        status: 'PENDING_TEAMS',
        matches: [],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const dto = ScheduleMapper.toRoundDTO(apiRound);

      expect(dto.id).toBe('round-1');
      expect(dto.competitionId).toBe('comp-1');
      expect(dto.golfCourseId).toBe('gc-1');
      expect(dto.golfCourseName).toBe('Club de Golf');
      expect(dto.roundDate).toBe('2025-06-15');
      expect(dto.sessionType).toBe('MORNING');
      expect(dto.matchFormat).toBe('FOURBALL');
      expect(dto.handicapMode).toBe('MATCH_PLAY');
      expect(dto.allowancePercentage).toBe(90);
      expect(dto.effectiveAllowance).toBe(90);
      expect(dto.status).toBe('PENDING_TEAMS');
      expect(dto.matches).toEqual([]);
    });

    it('should handle null optional fields', () => {
      const apiRound = {
        id: 'r-1',
        competition_id: 'c-1',
        golf_course_id: 'gc-1',
        date: '2025-06-15',
        session_type: 'AFTERNOON',
        match_format: 'SINGLES',
        status: 'PENDING_TEAMS',
      };

      const dto = ScheduleMapper.toRoundDTO(apiRound);
      expect(dto.handicapMode).toBeNull();
      expect(dto.allowancePercentage).toBeNull();
      expect(dto.effectiveAllowance).toBeNull();
      expect(dto.golfCourseName).toBeNull();
      expect(dto.matches).toEqual([]);
    });
  });

  describe('toMatchDTO', () => {
    it('should map API match with nested player arrays to DTO', () => {
      const apiMatch = {
        id: 'match-1',
        round_id: 'round-1',
        match_number: 1,
        team_a_players: [
          { user_id: 'u1', playing_handicap: 12, tee_category: 'AMATEUR_MALE', strokes_received: [1, 3, 5] },
        ],
        team_b_players: [
          { user_id: 'u2', playing_handicap: 8, tee_category: 'AMATEUR_MALE', strokes_received: [] },
        ],
        status: 'SCHEDULED',
        handicap_strokes_given: 4,
        strokes_given_to_team: 'A',
        result: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const dto = ScheduleMapper.toMatchDTO(apiMatch);

      expect(dto.id).toBe('match-1');
      expect(dto.roundId).toBe('round-1');
      expect(dto.matchNumber).toBe(1);
      expect(dto.teamAPlayers).toHaveLength(1);
      expect(dto.teamAPlayers[0].userId).toBe('u1');
      expect(dto.teamAPlayers[0].playingHandicap).toBe(12);
      expect(dto.teamAPlayers[0].teeCategory).toBe('AMATEUR_MALE');
      expect(dto.teamAPlayers[0].strokesReceived).toEqual([1, 3, 5]);
      expect(dto.teamBPlayers).toHaveLength(1);
      expect(dto.teamBPlayers[0].userId).toBe('u2');
      expect(dto.status).toBe('SCHEDULED');
      expect(dto.handicapStrokesGiven).toBe(4);
      expect(dto.strokesGivenToTeam).toBe('A');
    });

    it('should map match with 2 players per team (FOURBALL)', () => {
      const apiMatch = {
        id: 'match-2',
        round_id: 'round-1',
        match_number: 2,
        team_a_players: [
          { user_id: 'u1', playing_handicap: 10, tee_category: 'AMATEUR_MALE', strokes_received: [] },
          { user_id: 'u2', playing_handicap: 14, tee_category: 'AMATEUR_MALE', strokes_received: [] },
        ],
        team_b_players: [
          { user_id: 'u3', playing_handicap: 12, tee_category: 'AMATEUR_MALE', strokes_received: [] },
          { user_id: 'u4', playing_handicap: 8, tee_category: 'AMATEUR_MALE', strokes_received: [] },
        ],
        status: 'SCHEDULED',
      };

      const dto = ScheduleMapper.toMatchDTO(apiMatch);
      expect(dto.teamAPlayers).toHaveLength(2);
      expect(dto.teamBPlayers).toHaveLength(2);
      expect(dto.teamAPlayers[1].userId).toBe('u2');
      expect(dto.teamBPlayers[1].userId).toBe('u4');
    });

    it('should handle match with no players assigned', () => {
      const apiMatch = {
        id: 'match-3',
        round_id: 'round-1',
        match_number: 1,
        status: 'SCHEDULED',
      };

      const dto = ScheduleMapper.toMatchDTO(apiMatch);
      expect(dto.teamAPlayers).toEqual([]);
      expect(dto.teamBPlayers).toEqual([]);
      expect(dto.handicapStrokesGiven).toBeNull();
      expect(dto.strokesGivenToTeam).toBeNull();
      expect(dto.result).toBeNull();
    });
  });

  describe('toScheduleDTO', () => {
    it('should map full schedule response with days structure', () => {
      const apiData = {
        competition_id: 'comp-1',
        team_assignment: {
          mode: 'MANUAL',
          team_a_player_ids: ['u1', 'u2'],
          team_b_player_ids: ['u3', 'u4'],
        },
        days: [
          {
            date: '2025-06-15',
            rounds: [
              {
                id: 'r-1',
                competition_id: 'comp-1',
                golf_course_id: 'gc-1',
                round_date: '2025-06-15',
                session_type: 'MORNING',
                match_format: 'SINGLES',
                status: 'PENDING_TEAMS',
                matches: [],
              },
            ],
          },
          {
            date: '2025-06-16',
            rounds: [
              {
                id: 'r-2',
                competition_id: 'comp-1',
                golf_course_id: 'gc-1',
                round_date: '2025-06-16',
                session_type: 'AFTERNOON',
                match_format: 'FOURBALL',
                status: 'PENDING_TEAMS',
                matches: [],
              },
            ],
          },
        ],
        total_rounds: 2,
        total_matches: 0,
      };

      const dto = ScheduleMapper.toScheduleDTO(apiData);
      expect(dto.competitionId).toBe('comp-1');
      expect(dto.teamAssignment.mode).toBe('MANUAL');
      expect(dto.teamAssignment.teamAPlayerIds).toEqual(['u1', 'u2']);
      expect(dto.rounds).toHaveLength(2);
      expect(dto.rounds[0].id).toBe('r-1');
      expect(dto.rounds[1].id).toBe('r-2');
    });

    it('should handle null team assignment and empty days', () => {
      const apiData = {
        competition_id: 'comp-1',
        days: [],
      };

      const dto = ScheduleMapper.toScheduleDTO(apiData);
      expect(dto.teamAssignment).toBeNull();
      expect(dto.rounds).toEqual([]);
    });

    it('should handle missing days field', () => {
      const apiData = {
        competition_id: 'comp-1',
      };

      const dto = ScheduleMapper.toScheduleDTO(apiData);
      expect(dto.rounds).toEqual([]);
    });
  });

  describe('toTeamAssignmentDTO', () => {
    it('should map team assignment response', () => {
      const apiTeams = {
        id: 'ta-1',
        competition_id: 'comp-1',
        mode: 'AUTOMATIC',
        team_a_player_ids: ['u1', 'u2', 'u3'],
        team_b_player_ids: ['u4', 'u5', 'u6'],
        created_at: '2025-01-01T00:00:00Z',
      };

      const dto = ScheduleMapper.toTeamAssignmentDTO(apiTeams);
      expect(dto.id).toBe('ta-1');
      expect(dto.competitionId).toBe('comp-1');
      expect(dto.mode).toBe('AUTOMATIC');
      expect(dto.teamAPlayerIds).toEqual(['u1', 'u2', 'u3']);
      expect(dto.teamBPlayerIds).toEqual(['u4', 'u5', 'u6']);
    });
  });
});
