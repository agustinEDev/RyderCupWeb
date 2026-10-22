import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiQuickMatchRepository from './ApiQuickMatchRepository';
import { TOPE_DE_ANOTAR_MS } from './topeDeAnotar';
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

  describe('createAndStart (FE #848)', () => {
    it('POSTea a /quick-matches/start el borrador entero, en snake_case y en orden', async () => {
      apiRequest.mockResolvedValue({ ...mockQuickMatchApi, status: 'IN_PROGRESS' });

      const qm = await repo.createAndStart({
        quickMatchId: 'id-1',
        golfCourseId: 'course-1',
        matchFormat: null,
        scoringFormat: 'MEDAL',
        name: 'Viernes',
        allowancePercentage: 95,
        playMode: 'HANDICAP',
        creatorTeeColor: 'WHITE',
        creatorTeeGender: 'MALE',
        creatorHandicap: 9.5,
        participants: [
          { kind: 'GUEST', firstName: 'Ana', lastName: 'Pérez', handicap: 18.4, team: null, teeColor: 'RED', teeGender: 'FEMALE' },
          { kind: 'FRIEND', friendUserId: 'user-2', handicap: null, team: null, teeColor: null, teeGender: null },
        ],
        scorerUserIds: ['user-1', 'user-2'],
      });

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches/start', {
        method: 'POST',
        body: JSON.stringify({
          quick_match_id: 'id-1',
          golf_course_id: 'course-1',
          match_format: null,
          scoring_format: 'MEDAL',
          name: 'Viernes',
          allowance_percentage: 95,
          play_mode: 'HANDICAP',
          creator_tee_color: 'WHITE',
          creator_tee_gender: 'MALE',
          creator_handicap: 9.5,
          participants: [
            { kind: 'GUEST', first_name: 'Ana', last_name: 'Pérez', handicap: 18.4, team: null, tee_color: 'RED', tee_gender: 'FEMALE' },
            { kind: 'FRIEND', friend_user_id: 'user-2', handicap: null, team: null, tee_color: null, tee_gender: null },
          ],
          scorer_user_ids: ['user-1', 'user-2'],
        }),
      });
      expect(qm).toBeInstanceOf(QuickMatch);
    });
  });

  describe('hide', () => {
    it('should POST to /quick-matches/{id}/hide with no body', async () => {
      apiRequest.mockResolvedValue({ ...mockQuickMatchApi, status: 'COMPLETED' });

      const result = await repo.hide('qm-1');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches/qm-1/hide', {
        method: 'POST',
      });
      expect(result).toBeInstanceOf(QuickMatch);
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
        topeMs: TOPE_DE_ANOTAR_MS,
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
        { method: 'POST', body: JSON.stringify({ score: 5 }), topeMs: TOPE_DE_ANOTAR_MS }
      );
    });
  });

  describe('get', () => {
    it('should GET /quick-matches/{id}', async () => {
      apiRequest.mockResolvedValue(mockQuickMatchApi);

      const result = await repo.get('qm-1');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches/qm-1', { topeMs: TOPE_DE_ANOTAR_MS });
      expect(result).toBeInstanceOf(QuickMatch);
    });
  });

  describe('getShared (K)', () => {
    it('GETs /quick-matches/{id}/shared and says it is read-only and whether the viewer played', async () => {
      apiRequest.mockResolvedValue({
        ...mockQuickMatchApi,
        status: 'COMPLETED',
        participants: [
          { participant_id: 'p-1', user_id: 'user-1', name: null, handicap: 10, team: null, is_guest: false },
          { participant_id: 'p-2', user_id: null, name: null, handicap: null, team: null, is_guest: true },
        ],
        read_only: true,
        viewer_is_participant: false,
      });

      const result = await repo.getShared('qm-1');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/quick-matches/qm-1/shared');
      expect(result.quickMatch).toBeInstanceOf(QuickMatch);
      expect(result.readOnly).toBe(true);
      expect(result.viewerIsParticipant).toBe(false);
      expect(result.quickMatch.participants.map((p) => [p.name, p.isGuest])).toEqual([
        [null, false],
        [null, true],
      ]);
    });

    it('a viewer who played is said so; read-only defaults to true', async () => {
      apiRequest.mockResolvedValue({ ...mockQuickMatchApi, status: 'COMPLETED', viewer_is_participant: true });

      const result = await repo.getShared('qm-1');

      expect(result.viewerIsParticipant).toBe(true);
      expect(result.readOnly).toBe(true);
    });

    it('lets a 403 through for the screen to handle', async () => {
      apiRequest.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
      await expect(repo.getShared('qm-1')).rejects.toMatchObject({ status: 403 });
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

// Las llamadas de anotar llevan tope de tiempo; el resto no (FE #624). Un envío
// colgado retenía la cola entera, porque en anotación se escribe de uno en uno
describe('ApiQuickMatchRepository · el tope de tiempo de anotar (FE #624)', () => {
  const repo = new ApiQuickMatchRepository();
  const topeDe = () => apiRequest.mock.calls[0][1]?.topeMs;

  beforeEach(() => {
    vi.clearAllMocks();
    apiRequest.mockResolvedValue(mockQuickMatchApi);
  });

  it.each([
    ['la partida', (r) => r.get('qm-1')],
    ['anotar un hoyo', (r) => r.submitHoleScore('qm-1', 1, 4)],
    ['anotar por otro', (r) => r.submitProxyHoleScore('qm-1', 'p-2', 1, 4)],
    ['entregar la tarjeta', (r) => r.complete('qm-1')],
  ])('%s lo lleva', async (_, llamada) => {
    await llamada(repo).catch(() => {});

    expect(topeDe()).toBe(TOPE_DE_ANOTAR_MS);
  });

  it('empezarla no: no retiene ninguna cola', async () => {
    await repo
      .createAndStart({ quickMatchId: 'qm-1', golfCourseId: 'c-1', participants: [], scorerUserIds: ['u-1'] })
      .catch(() => {});

    expect(topeDe()).toBeUndefined();
  });
});
