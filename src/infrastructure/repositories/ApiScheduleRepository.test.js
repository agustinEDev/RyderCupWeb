import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiScheduleRepository from './ApiScheduleRepository';

// Mock domain interface
vi.mock('../../domain/repositories/IScheduleRepository.js', () => ({
  default: class IScheduleRepository {},
}));

// Mock api.js
vi.mock('../../services/api.js', () => ({
  default: vi.fn(),
}));

import apiRequest from '../../services/api.js';

describe('ApiScheduleRepository', () => {
  let repo;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ApiScheduleRepository();
  });

  describe('getSchedule', () => {
    it('should call GET /api/v1/competitions/{id}/schedule', async () => {
      apiRequest.mockResolvedValue({
        competition_id: 'comp-1',
        rounds: [],
      });

      const result = await repo.getSchedule('comp-1');
      expect(apiRequest).toHaveBeenCalledWith('/api/v1/competitions/comp-1/schedule');
      expect(result.competitionId).toBe('comp-1');
    });
  });

  describe('configureSchedule', () => {
    it('should call POST with config', async () => {
      apiRequest.mockResolvedValue({ success: true });
      const config = { some: 'config' };

      await repo.configureSchedule('comp-1', config);
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/comp-1/schedule/configure',
        { method: 'POST', body: JSON.stringify(config) }
      );
    });
  });

  describe('assignTeams', () => {
    it('should call POST and return TeamAssignment DTO', async () => {
      apiRequest.mockResolvedValue({
        id: 'ta-1',
        competition_id: 'comp-1',
        mode: 'MANUAL',
        team_a_player_ids: ['u1'],
        team_b_player_ids: ['u2'],
        created_at: '2025-01-01',
      });

      const result = await repo.assignTeams('comp-1', { mode: 'MANUAL' });
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/comp-1/teams',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.mode).toBe('MANUAL');
    });
  });

  describe('createRound', () => {
    it('should call POST and return Round DTO', async () => {
      const roundData = {
        golf_course_id: 'gc-1',
        date: '2025-06-15',
        session_type: 'MORNING',
        match_format: 'SINGLES',
      };
      apiRequest.mockResolvedValue({
        id: 'r-1',
        competition_id: 'comp-1',
        ...roundData,
        status: 'PENDING_TEAMS',
      });

      const result = await repo.createRound('comp-1', roundData);
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/comp-1/rounds',
        { method: 'POST', body: JSON.stringify(roundData) }
      );
      expect(result.id).toBe('r-1');
    });
  });

  describe('updateRound', () => {
    it('should call PUT and return updated Round DTO', async () => {
      apiRequest.mockResolvedValue({
        id: 'r-1',
        competition_id: 'comp-1',
        date: '2025-06-16',
        session_type: 'AFTERNOON',
        match_format: 'SINGLES',
        status: 'PENDING_TEAMS',
      });

      const result = await repo.updateRound('r-1', { date: '2025-06-16' });
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/rounds/r-1',
        expect.objectContaining({ method: 'PUT' })
      );
      expect(result.roundDate).toBe('2025-06-16');
    });
  });

  describe('deleteRound', () => {
    it('should call DELETE', async () => {
      apiRequest.mockResolvedValue(null);
      await repo.deleteRound('r-1');
      expect(apiRequest).toHaveBeenCalledWith('/api/v1/competitions/rounds/r-1', { method: 'DELETE' });
    });
  });

  describe('generateMatches', () => {
    it('should send empty object for automatic generation', async () => {
      apiRequest.mockResolvedValue({ matches_created: 6 });

      const result = await repo.generateMatches('r-1', {});
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/rounds/r-1/matches/generate',
        { method: 'POST', body: '{}' }
      );
      expect(result.matches_created).toBe(6);
    });

    it('should send empty object when no pairings', async () => {
      apiRequest.mockResolvedValue({ matches_created: 6 });
      await repo.generateMatches('r-1');
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/rounds/r-1/matches/generate',
        { method: 'POST', body: '{}' }
      );
    });

    it('should transform camelCase manual pairings to snake_case API format', async () => {
      apiRequest.mockResolvedValue({ matches_created: 2 });

      const pairings = {
        manualPairings: [
          { teamAPlayerIds: ['u1', 'u2'], teamBPlayerIds: ['u3', 'u4'] },
          { teamAPlayerIds: ['u5'], teamBPlayerIds: ['u6'] },
        ],
      };

      await repo.generateMatches('r-1', pairings);
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/rounds/r-1/matches/generate',
        {
          method: 'POST',
          body: JSON.stringify({
            manual_pairings: [
              { team_a_player_ids: ['u1', 'u2'], team_b_player_ids: ['u3', 'u4'] },
              { team_a_player_ids: ['u5'], team_b_player_ids: ['u6'] },
            ],
          }),
        }
      );
    });
  });

  describe('getMatchDetail', () => {
    it('should call GET and return Match DTO', async () => {
      apiRequest.mockResolvedValue({
        id: 'm-1',
        round_id: 'r-1',
        match_number: 1,
        status: 'SCHEDULED',
      });

      const result = await repo.getMatchDetail('m-1');
      expect(apiRequest).toHaveBeenCalledWith('/api/v1/competitions/matches/m-1');
      expect(result.id).toBe('m-1');
      expect(result.matchNumber).toBe(1);
    });
  });

  describe('updateMatchStatus', () => {
    it('should call PUT with action', async () => {
      apiRequest.mockResolvedValue({ status: 'IN_PROGRESS' });

      await repo.updateMatchStatus('m-1', 'start');
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/matches/m-1/status',
        { method: 'PUT', body: JSON.stringify({ action: 'start' }) }
      );
    });

    it('should include result when provided', async () => {
      apiRequest.mockResolvedValue({ status: 'COMPLETED' });

      await repo.updateMatchStatus('m-1', 'complete', { score: '3&2' });
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/matches/m-1/status',
        { method: 'PUT', body: JSON.stringify({ action: 'complete', result: { score: '3&2' } }) }
      );
    });
  });

  describe('declareWalkover', () => {
    it('should call POST with winning team and reason', async () => {
      apiRequest.mockResolvedValue({ status: 'WALKOVER' });

      await repo.declareWalkover('m-1', 'A', 'Player injured');
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/matches/m-1/walkover',
        { method: 'POST', body: JSON.stringify({ winning_team: 'A', reason: 'Player injured' }) }
      );
    });
  });

  describe('reassignPlayers', () => {
    it('should call PUT with player ids', async () => {
      apiRequest.mockResolvedValue({ success: true });

      await repo.reassignPlayers('m-1', ['u1', 'u2'], ['u3', 'u4']);
      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/competitions/matches/m-1/players',
        { method: 'PUT', body: JSON.stringify({ team_a_player_ids: ['u1', 'u2'], team_b_player_ids: ['u3', 'u4'] }) }
      );
    });
  });
});
