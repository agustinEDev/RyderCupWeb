import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiScoringRepository from './ApiScoringRepository';

// Mock domain interface
vi.mock('../../domain/repositories/IScoringRepository.js', () => ({
  default: class IScoringRepository {},
}));

// Mock api.js
vi.mock('../../services/api.js', () => ({
  default: vi.fn(),
}));

import apiRequest from '../../services/api.js';

describe('ApiScoringRepository', () => {
  let repo;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ApiScoringRepository();
  });

  describe('getScoringView', () => {
    it('should call GET /api/v1/matches/{id}/scoring-view and return DTO', async () => {
      apiRequest.mockResolvedValue({
        match_id: 'match-1',
        match_number: 1,
        match_format: 'SINGLES',
        match_status: 'IN_PROGRESS',
      });

      const result = await repo.getScoringView('match-1');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/matches/match-1/scoring-view');
      expect(result.matchId).toBe('match-1');
      expect(result.matchFormat).toBe('SINGLES');
      expect(result.matchStatus).toBe('IN_PROGRESS');
    });
  });

  describe('submitHoleScore', () => {
    it('should call POST with score data in snake_case', async () => {
      apiRequest.mockResolvedValue({
        match_id: 'match-1',
        match_number: 1,
        match_format: 'SINGLES',
        match_status: 'IN_PROGRESS',
      });

      const scoreData = {
        ownScore: 5,
        markedPlayerId: 'u2',
        markedScore: 4,
      };

      const result = await repo.submitHoleScore('match-1', 3, scoreData);

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/matches/match-1/scores/holes/3', {
        method: 'POST',
        body: JSON.stringify({
          own_score: 5,
          marked_player_id: 'u2',
          marked_score: 4,
        }),
      });
      expect(result.matchId).toBe('match-1');
    });

    it('should handle null scores (picked up ball)', async () => {
      apiRequest.mockResolvedValue({
        match_id: 'match-1',
        match_number: 1,
        match_format: 'SINGLES',
        match_status: 'IN_PROGRESS',
      });

      const scoreData = {
        ownScore: null,
        markedPlayerId: 'u2',
        markedScore: null,
      };

      await repo.submitHoleScore('match-1', 5, scoreData);

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/matches/match-1/scores/holes/5', {
        method: 'POST',
        body: JSON.stringify({
          own_score: null,
          marked_player_id: 'u2',
          marked_score: null,
        }),
      });
    });
  });

  describe('submitScorecard', () => {
    it('should call POST with empty body and return match summary DTO', async () => {
      apiRequest.mockResolvedValue({
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
      });

      const result = await repo.submitScorecard('match-1');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/matches/match-1/scorecard/submit', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      expect(result.matchId).toBe('match-1');
      expect(result.submittedBy).toBe('u1');
      expect(result.result.winner).toBe('A');
      expect(result.stats.playerGrossTotal).toBe(82);
      expect(result.matchComplete).toBe(true);
    });
  });

  describe('getLeaderboard', () => {
    it('should call GET /api/v1/competitions/{id}/leaderboard and return DTO', async () => {
      apiRequest.mockResolvedValue({
        competition_id: 'comp-1',
        competition_name: 'Ryder Cup 2026',
        team_a_name: 'Rojo',
        team_b_name: 'Azul',
        team_a_points: 4.5,
        team_b_points: 3.5,
        matches: [],
      });

      const result = await repo.getLeaderboard('comp-1');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/competitions/comp-1/leaderboard');
      expect(result.competitionId).toBe('comp-1');
      expect(result.teamAPoints).toBe(4.5);
      expect(result.teamBPoints).toBe(3.5);
    });
  });

  describe('concedeMatch', () => {
    it('should call PUT with concede action and team', async () => {
      apiRequest.mockResolvedValue({ status: 'CONCEDED' });

      await repo.concedeMatch('match-1', 'A', 'Player injury');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/matches/match-1/status', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'concede',
          conceding_team: 'A',
          reason: 'Player injury',
        }),
      });
    });

    it('should omit reason when null', async () => {
      apiRequest.mockResolvedValue({ status: 'CONCEDED' });

      await repo.concedeMatch('match-1', 'B', null);

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/matches/match-1/status', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'concede',
          conceding_team: 'B',
        }),
      });
    });

    it('should omit reason when undefined', async () => {
      apiRequest.mockResolvedValue({ status: 'CONCEDED' });

      await repo.concedeMatch('match-1', 'A');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/matches/match-1/status', {
        method: 'PUT',
        body: JSON.stringify({
          action: 'concede',
          conceding_team: 'A',
        }),
      });
    });
  });
});
