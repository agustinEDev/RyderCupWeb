import { describe, it, expect } from 'vitest';
import ScoringMapper from './ScoringMapper';

describe('ScoringMapper', () => {
  describe('toScoringViewDTO', () => {
    const fullApiResponse = {
      match_id: 'match-1',
      match_number: 1,
      match_format: 'SINGLES',
      match_status: 'IN_PROGRESS',
      is_decided: false,
      decided_result: null,
      round_info: {
        id: 'round-1',
        date: '2026-03-01',
        session_type: 'MORNING',
        golf_course_name: 'Club de Golf Madrid',
      },
      competition_id: 'comp-1',
      team_a_name: 'Equipo Rojo',
      team_b_name: 'Equipo Azul',
      marker_assignments: [
        {
          scorer_user_id: 'u1',
          scorer_name: 'Agustin',
          marks_user_id: 'u2',
          marks_name: 'Pedro',
          marked_by_user_id: 'u2',
          marked_by_name: 'Pedro',
        },
      ],
      players: [
        {
          user_id: 'u1',
          user_name: 'Agustin',
          team: 'A',
          tee_category: 'AMATEUR',
          playing_handicap: 12,
          strokes_received: [1, 3, 5, 7, 9, 11, 13, 15, 17],
        },
        {
          user_id: 'u2',
          user_name: 'Pedro',
          team: 'B',
          tee_category: 'AMATEUR',
          playing_handicap: 8,
          strokes_received: [1, 5, 9, 13],
        },
      ],
      holes: [
        { hole_number: 1, par: 4, stroke_index: 7 },
        { hole_number: 2, par: 3, stroke_index: 15 },
      ],
      scores: [
        {
          hole_number: 1,
          player_scores: [
            {
              user_id: 'u1',
              own_score: 5,
              marker_score: 5,
              validation_status: 'match',
              net_score: 4,
              strokes_received_this_hole: 1,
            },
            {
              user_id: 'u2',
              own_score: 4,
              marker_score: 4,
              validation_status: 'match',
              net_score: 4,
              strokes_received_this_hole: 0,
            },
          ],
          hole_result: {
            winner: 'HALVED',
            standing: 'AS',
            standing_team: null,
          },
        },
      ],
      match_standing: {
        status: 'AS',
        leading_team: null,
        holes_played: 1,
        holes_remaining: 17,
      },
      scorecard_submitted_by: [],
    };

    it('should map full scoring view response to camelCase DTO', () => {
      const dto = ScoringMapper.toScoringViewDTO(fullApiResponse);

      expect(dto.matchId).toBe('match-1');
      expect(dto.matchNumber).toBe(1);
      expect(dto.matchFormat).toBe('SINGLES');
      expect(dto.matchStatus).toBe('IN_PROGRESS');
      expect(dto.isDecided).toBe(false);
      expect(dto.decidedResult).toBeNull();
      expect(dto.competitionId).toBe('comp-1');
      expect(dto.teamAName).toBe('Equipo Rojo');
      expect(dto.teamBName).toBe('Equipo Azul');
    });

    it('should map round info', () => {
      const dto = ScoringMapper.toScoringViewDTO(fullApiResponse);

      expect(dto.roundInfo.id).toBe('round-1');
      expect(dto.roundInfo.date).toBe('2026-03-01');
      expect(dto.roundInfo.sessionType).toBe('MORNING');
      expect(dto.roundInfo.golfCourseName).toBe('Club de Golf Madrid');
    });

    it('should map marker assignments', () => {
      const dto = ScoringMapper.toScoringViewDTO(fullApiResponse);

      expect(dto.markerAssignments).toHaveLength(1);
      expect(dto.markerAssignments[0].scorerUserId).toBe('u1');
      expect(dto.markerAssignments[0].scorerName).toBe('Agustin');
      expect(dto.markerAssignments[0].marksUserId).toBe('u2');
      expect(dto.markerAssignments[0].marksName).toBe('Pedro');
      expect(dto.markerAssignments[0].markedByUserId).toBe('u2');
      expect(dto.markerAssignments[0].markedByName).toBe('Pedro');
    });

    it('should map players with strokes received', () => {
      const dto = ScoringMapper.toScoringViewDTO(fullApiResponse);

      expect(dto.players).toHaveLength(2);
      expect(dto.players[0].userId).toBe('u1');
      expect(dto.players[0].userName).toBe('Agustin');
      expect(dto.players[0].team).toBe('A');
      expect(dto.players[0].teeCategory).toBe('AMATEUR');
      expect(dto.players[0].playingHandicap).toBe(12);
      expect(dto.players[0].strokesReceived).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17]);
    });

    it('should map holes', () => {
      const dto = ScoringMapper.toScoringViewDTO(fullApiResponse);

      expect(dto.holes).toHaveLength(2);
      expect(dto.holes[0].holeNumber).toBe(1);
      expect(dto.holes[0].par).toBe(4);
      expect(dto.holes[0].strokeIndex).toBe(7);
    });

    it('should map scores with player scores and hole results', () => {
      const dto = ScoringMapper.toScoringViewDTO(fullApiResponse);

      expect(dto.scores).toHaveLength(1);
      expect(dto.scores[0].holeNumber).toBe(1);
      expect(dto.scores[0].playerScores).toHaveLength(2);
      expect(dto.scores[0].playerScores[0].userId).toBe('u1');
      expect(dto.scores[0].playerScores[0].ownScore).toBe(5);
      expect(dto.scores[0].playerScores[0].markerScore).toBe(5);
      expect(dto.scores[0].playerScores[0].validationStatus).toBe('match');
      expect(dto.scores[0].playerScores[0].netScore).toBe(4);
      expect(dto.scores[0].playerScores[0].strokesReceivedThisHole).toBe(1);
    });

    it('should map hole result', () => {
      const dto = ScoringMapper.toScoringViewDTO(fullApiResponse);

      expect(dto.scores[0].holeResult.winner).toBe('HALVED');
      expect(dto.scores[0].holeResult.standing).toBe('AS');
      expect(dto.scores[0].holeResult.standingTeam).toBeNull();
    });

    it('should map match standing', () => {
      const dto = ScoringMapper.toScoringViewDTO(fullApiResponse);

      expect(dto.matchStanding.status).toBe('AS');
      expect(dto.matchStanding.leadingTeam).toBeNull();
      expect(dto.matchStanding.holesPlayed).toBe(1);
      expect(dto.matchStanding.holesRemaining).toBe(17);
    });

    it('should map decided result when match is decided', () => {
      const decided = {
        ...fullApiResponse,
        is_decided: true,
        decided_result: { winner: 'A', score: '5&4' },
      };
      const dto = ScoringMapper.toScoringViewDTO(decided);

      expect(dto.isDecided).toBe(true);
      expect(dto.decidedResult.winner).toBe('A');
      expect(dto.decidedResult.score).toBe('5&4');
    });

    it('should handle missing optional fields', () => {
      const minimal = {
        match_id: 'match-1',
        match_number: 1,
        match_format: 'SINGLES',
        match_status: 'SCHEDULED',
      };
      const dto = ScoringMapper.toScoringViewDTO(minimal);

      expect(dto.matchId).toBe('match-1');
      expect(dto.isDecided).toBe(false);
      expect(dto.decidedResult).toBeNull();
      expect(dto.roundInfo).toBeNull();
      expect(dto.markerAssignments).toEqual([]);
      expect(dto.players).toEqual([]);
      expect(dto.holes).toEqual([]);
      expect(dto.scores).toEqual([]);
      expect(dto.matchStanding).toBeNull();
      expect(dto.scorecardSubmittedBy).toEqual([]);
    });

    it('should handle null validation_status as pending', () => {
      const data = {
        ...fullApiResponse,
        scores: [{
          hole_number: 1,
          player_scores: [{
            user_id: 'u1',
            own_score: 5,
            marker_score: null,
            validation_status: null,
            net_score: null,
            strokes_received_this_hole: null,
          }],
          hole_result: null,
        }],
      };
      const dto = ScoringMapper.toScoringViewDTO(data);

      expect(dto.scores[0].playerScores[0].validationStatus).toBe('pending');
      expect(dto.scores[0].playerScores[0].markerScore).toBeNull();
      expect(dto.scores[0].playerScores[0].netScore).toBeNull();
      expect(dto.scores[0].playerScores[0].strokesReceivedThisHole).toBe(0);
      expect(dto.scores[0].holeResult).toBeNull();
    });

    it('should handle missing strokes_received on players', () => {
      const data = {
        ...fullApiResponse,
        players: [{ user_id: 'u1', user_name: 'Test', team: 'A', tee_category: 'AMATEUR', playing_handicap: 0 }],
      };
      const dto = ScoringMapper.toScoringViewDTO(data);
      expect(dto.players[0].strokesReceived).toEqual([]);
    });
  });

  describe('toLeaderboardDTO', () => {
    const fullLeaderboard = {
      competition_id: 'comp-1',
      competition_name: 'Ryder Cup Amateur 2026',
      team_a_name: 'Equipo Rojo',
      team_b_name: 'Equipo Azul',
      team_a_points: 4.5,
      team_b_points: 3.5,
      matches: [
        {
          match_id: 'match-1',
          match_number: 1,
          match_format: 'FOURBALL',
          status: 'IN_PROGRESS',
          current_hole: 12,
          standing: '2UP',
          leading_team: 'A',
          team_a_players: [
            { user_id: 'u1', user_name: 'Agustin' },
            { user_id: 'u2', user_name: 'Carlos' },
          ],
          team_b_players: [
            { user_id: 'u3', user_name: 'Pedro' },
            { user_id: 'u4', user_name: 'Maria' },
          ],
          result: null,
        },
        {
          match_id: 'match-2',
          match_number: 2,
          match_format: 'SINGLES',
          status: 'COMPLETED',
          current_hole: 18,
          standing: null,
          leading_team: null,
          team_a_players: [{ user_id: 'u5', user_name: 'Luis' }],
          team_b_players: [{ user_id: 'u6', user_name: 'Ana' }],
          result: { winner: 'B', score: '2&1' },
        },
      ],
    };

    it('should map full leaderboard response', () => {
      const dto = ScoringMapper.toLeaderboardDTO(fullLeaderboard);

      expect(dto.competitionId).toBe('comp-1');
      expect(dto.competitionName).toBe('Ryder Cup Amateur 2026');
      expect(dto.teamAName).toBe('Equipo Rojo');
      expect(dto.teamBName).toBe('Equipo Azul');
      expect(dto.teamAPoints).toBe(4.5);
      expect(dto.teamBPoints).toBe(3.5);
    });

    it('should map in-progress match', () => {
      const dto = ScoringMapper.toLeaderboardDTO(fullLeaderboard);
      const match = dto.matches[0];

      expect(match.matchId).toBe('match-1');
      expect(match.matchNumber).toBe(1);
      expect(match.matchFormat).toBe('FOURBALL');
      expect(match.status).toBe('IN_PROGRESS');
      expect(match.currentHole).toBe(12);
      expect(match.standing).toBe('2UP');
      expect(match.leadingTeam).toBe('A');
      expect(match.teamAPlayers).toHaveLength(2);
      expect(match.teamAPlayers[0].userId).toBe('u1');
      expect(match.teamAPlayers[0].userName).toBe('Agustin');
      expect(match.result).toBeNull();
    });

    it('should map completed match with result', () => {
      const dto = ScoringMapper.toLeaderboardDTO(fullLeaderboard);
      const match = dto.matches[1];

      expect(match.status).toBe('COMPLETED');
      expect(match.standing).toBeNull();
      expect(match.leadingTeam).toBeNull();
      expect(match.result.winner).toBe('B');
      expect(match.result.score).toBe('2&1');
    });

    it('should handle missing optional fields with defaults', () => {
      const minimal = {
        competition_id: 'comp-1',
        competition_name: 'Test',
        team_a_name: 'A',
        team_b_name: 'B',
      };
      const dto = ScoringMapper.toLeaderboardDTO(minimal);

      expect(dto.teamAPoints).toBe(0);
      expect(dto.teamBPoints).toBe(0);
      expect(dto.matches).toEqual([]);
    });

    it('should handle match with missing players', () => {
      const data = {
        ...fullLeaderboard,
        matches: [{
          match_id: 'm-1',
          match_number: 1,
          match_format: 'SINGLES',
          status: 'SCHEDULED',
        }],
      };
      const dto = ScoringMapper.toLeaderboardDTO(data);

      expect(dto.matches[0].teamAPlayers).toEqual([]);
      expect(dto.matches[0].teamBPlayers).toEqual([]);
      expect(dto.matches[0].currentHole).toBeNull();
      expect(dto.matches[0].standing).toBeNull();
      expect(dto.matches[0].leadingTeam).toBeNull();
      expect(dto.matches[0].result).toBeNull();
    });
  });

  describe('toMatchSummaryDTO', () => {
    it('should map full submit response', () => {
      const apiData = {
        match_id: 'match-1',
        submitted_by: 'u1',
        result: {
          winner: 'A',
          score: '3&2',
          team_a_points: 1,
          team_b_points: 0,
        },
        stats: {
          player_gross_total: 82,
          player_net_total: 72,
          holes_won: 8,
          holes_lost: 5,
          holes_halved: 5,
        },
        match_complete: true,
      };

      const dto = ScoringMapper.toMatchSummaryDTO(apiData);

      expect(dto.matchId).toBe('match-1');
      expect(dto.submittedBy).toBe('u1');
      expect(dto.result.winner).toBe('A');
      expect(dto.result.score).toBe('3&2');
      expect(dto.result.teamAPoints).toBe(1);
      expect(dto.result.teamBPoints).toBe(0);
      expect(dto.stats.playerGrossTotal).toBe(82);
      expect(dto.stats.playerNetTotal).toBe(72);
      expect(dto.stats.holesWon).toBe(8);
      expect(dto.stats.holesLost).toBe(5);
      expect(dto.stats.holesHalved).toBe(5);
      expect(dto.matchComplete).toBe(true);
    });

    it('should handle halved match', () => {
      const apiData = {
        match_id: 'match-1',
        submitted_by: 'u1',
        result: {
          winner: null,
          score: 'AS',
          team_a_points: 0.5,
          team_b_points: 0.5,
        },
        stats: {
          player_gross_total: 80,
          player_net_total: 72,
          holes_won: 7,
          holes_lost: 7,
          holes_halved: 4,
        },
        match_complete: false,
      };

      const dto = ScoringMapper.toMatchSummaryDTO(apiData);

      expect(dto.result.winner).toBeNull();
      expect(dto.result.teamAPoints).toBe(0.5);
      expect(dto.result.teamBPoints).toBe(0.5);
      expect(dto.matchComplete).toBe(false);
    });

    it('should handle missing result and stats', () => {
      const apiData = {
        match_id: 'match-1',
        submitted_by: 'u1',
      };

      const dto = ScoringMapper.toMatchSummaryDTO(apiData);

      expect(dto.result).toBeNull();
      expect(dto.stats).toBeNull();
      expect(dto.matchComplete).toBe(false);
    });
  });
});
