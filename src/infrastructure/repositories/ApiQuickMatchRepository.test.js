import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiQuickMatchRepository from './ApiQuickMatchRepository';
import QuickMatch from '../../domain/entities/QuickMatch';

vi.mock('../../domain/repositories/IQuickMatchRepository.js', () => ({
  default: class IQuickMatchRepository {},
}));

vi.mock('../../services/api.js', () => ({
  default: vi.fn(),
}));

import apiRequest from '../../services/api.js';

const mockQuickMatchApi = {
  id: 'qm-1',
  creator_id: 'user-1',
  golf_course_id: 'course-1',
  match_format: 'SINGLES',
  status: 'PENDING',
  participants: [
    { participant_id: 'p-1', user_id: 'user-1', name: 'Creator', handicap: 10, team: null, is_guest: false },
  ],
  scorer_ids: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('ApiQuickMatchRepository', () => {
  let repo;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ApiQuickMatchRepository();
  });

  describe('create', () => {
    it('should POST to /quick-matches with golf_course_id, match_format and name null by default', async () => {
      apiRequest.mockResolvedValue(mockQuickMatchApi);

      const result = await repo.create('course-1', 'SINGLES');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches', {
        method: 'POST',
        body: JSON.stringify({ golf_course_id: 'course-1', match_format: 'SINGLES', name: null }),
      });
      expect(result).toBeInstanceOf(QuickMatch);
    });

    it('should POST the given name when provided', async () => {
      apiRequest.mockResolvedValue(mockQuickMatchApi);

      await repo.create('course-1', 'SINGLES', 'Viernes con Rafa');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches', {
        method: 'POST',
        body: JSON.stringify({
          golf_course_id: 'course-1',
          match_format: 'SINGLES',
          name: 'Viernes con Rafa',
        }),
      });
    });
  });

  describe('addFriendParticipant', () => {
    it('should POST to /quick-matches/{id}/participants with friend_user_id and team', async () => {
      apiRequest.mockResolvedValue(mockQuickMatchApi);

      await repo.addFriendParticipant('qm-1', 'user-2', 'A');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches/qm-1/participants', {
        method: 'POST',
        body: JSON.stringify({ friend_user_id: 'user-2', team: 'A' }),
      });
    });
  });

  describe('addGuestParticipant', () => {
    it('should POST to /quick-matches/{id}/participants/guest with guest data', async () => {
      apiRequest.mockResolvedValue(mockQuickMatchApi);

      await repo.addGuestParticipant('qm-1', {
        firstName: 'Jane',
        lastName: 'Doe',
        handicap: 15,
        team: null,
      });

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches/qm-1/participants/guest', {
        method: 'POST',
        body: JSON.stringify({ first_name: 'Jane', last_name: 'Doe', handicap: 15, team: null }),
      });
    });
  });

  describe('start', () => {
    it('should POST to /quick-matches/{id}/start with scorer_ids', async () => {
      apiRequest.mockResolvedValue({ ...mockQuickMatchApi, status: 'IN_PROGRESS' });

      await repo.start('qm-1', ['p-1']);

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches/qm-1/start', {
        method: 'POST',
        body: JSON.stringify({ scorer_ids: ['p-1'] }),
      });
    });
  });

  describe('submitHoleScore', () => {
    it('should POST to /quick-matches/{id}/holes/{n}/score and return raw data', async () => {
      const scoreResponse = { hole_number: 1, participant_id: 'p-1', score: 4, recorded_by_participant_id: 'p-1' };
      apiRequest.mockResolvedValue(scoreResponse);

      const result = await repo.submitHoleScore('qm-1', 1, 4);

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches/qm-1/holes/1/score', {
        method: 'POST',
        body: JSON.stringify({ score: 4 }),
      });
      expect(result).toEqual(scoreResponse);
    });
  });

  describe('submitProxyHoleScore', () => {
    it('should POST to /quick-matches/{id}/participants/{participantId}/holes/{n}/score', async () => {
      apiRequest.mockResolvedValue({ hole_number: 1, participant_id: 'p-2', score: 5, recorded_by_participant_id: 'p-1' });

      await repo.submitProxyHoleScore('qm-1', 'p-2', 1, 5);

      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/quick-matches/qm-1/participants/p-2/holes/1/score',
        { method: 'POST', body: JSON.stringify({ score: 5 }) }
      );
    });
  });

  describe('get', () => {
    it('should GET /quick-matches/{id}', async () => {
      apiRequest.mockResolvedValue(mockQuickMatchApi);

      const result = await repo.get('qm-1');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches/qm-1');
      expect(result).toBeInstanceOf(QuickMatch);
    });
  });

  describe('listMine', () => {
    it('should GET /quick-matches/me with query filters and map results', async () => {
      apiRequest.mockResolvedValue({
        quick_matches: [mockQuickMatchApi],
        total_count: 1,
        page: 1,
        limit: 20,
      });

      const result = await repo.listMine({ status: 'PENDING', page: 1, limit: 20 });

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches/me?status=PENDING&page=1&limit=20');
      expect(result.quickMatches).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it('should default to an empty query string when no filters are given', async () => {
      apiRequest.mockResolvedValue({ quick_matches: [], total_count: 0, page: 1, limit: 20 });

      await repo.listMine();

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches/me');
    });
  });
});
