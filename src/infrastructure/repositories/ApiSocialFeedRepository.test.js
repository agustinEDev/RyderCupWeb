import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiSocialFeedRepository from './ApiSocialFeedRepository';

vi.mock('../../services/api.js', () => ({
  default: vi.fn(),
}));

import apiRequest from '../../services/api.js';

const respuestaPerfil = (overrides = {}) => ({
  id: 'u1',
  first_name: 'Ana',
  last_name: 'García',
  avatar_source: 'preset',
  avatar_preset_id: 3,
  has_avatar_upload: false,
  friends_count: 5,
  is_friend: false,
  friendship: { status: 'NONE', friendship_id: null },
  email: null,
  handicap: null,
  stats: null,
  ...overrides,
});

const respuestaStats = (overrides = {}) => ({
  handicap: 12.4,
  handicap_trend: -0.6,
  scoring_avg: 3.2,
  rounds_played: 14,
  tournaments_total: 2,
  tournaments_active: 1,
  estimated_index: 11.8,
  playing_avg: 15.1,
  best_differential: 8.3,
  rounds_with_differential: 12,
  ...overrides,
});

describe('ApiSocialFeedRepository', () => {
  let repository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ApiSocialFeedRepository();
  });

  describe('getPlayerProfile', () => {
    it('maps the public card to camelCase', async () => {
      apiRequest.mockResolvedValue(respuestaPerfil());

      const perfil = await repository.getPlayerProfile('u1');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/users/u1/profile');
      expect(perfil.firstName).toBe('Ana');
      expect(perfil.lastName).toBe('García');
      expect(perfil.avatarPresetId).toBe(3);
      expect(perfil.friendsCount).toBe(5);
      expect(perfil.friendship).toEqual({ status: 'NONE', friendshipId: null });
    });

    it('keeps the private fields as null instead of turning them into zero', async () => {
      // Un cero se leería como "juega fatal" en vez de "esto no se puede ver".
      apiRequest.mockResolvedValue(respuestaPerfil());

      const perfil = await repository.getPlayerProfile('u1');

      expect(perfil.email).toBeNull();
      expect(perfil.handicap).toBeNull();
      expect(perfil.stats).toBeNull();
    });

    it('maps a friend stats block through the same mapper as your own stats', async () => {
      // Es el mismo DTO del backend: devolverlo en snake_case obligaría a la
      // pantalla de perfil a leerlo de otra forma que el resto del frontend.
      apiRequest.mockResolvedValue(
        respuestaPerfil({
          is_friend: true,
          friendship: { status: 'ACCEPTED', friendship_id: 'f1' },
          email: 'ana@example.com',
          handicap: 12.4,
          stats: respuestaStats(),
        })
      );

      const perfil = await repository.getPlayerProfile('u1');

      expect(perfil.isFriend).toBe(true);
      expect(perfil.email).toBe('ana@example.com');
      expect(perfil.stats.scoringAvg).toBe(3.2);
      expect(perfil.stats.roundsPlayed).toBe(14);
      expect(perfil.stats.estimatedIndex).toBe(11.8);
      expect(perfil.stats.bestDifferential).toBe(8.3);
      expect(perfil.stats.tournamentsTotal).toBe(2);
    });

    it('does not confuse a missing stat with a zero when mapping', async () => {
      apiRequest.mockResolvedValue(
        respuestaPerfil({
          is_friend: true,
          stats: respuestaStats({ scoring_avg: null, estimated_index: null }),
        })
      );

      const perfil = await repository.getPlayerProfile('u1');

      expect(perfil.stats.scoringAvg).toBeNull();
      expect(perfil.stats.estimatedIndex).toBeNull();
    });

    it('defaults the friendship state when the response carries none', async () => {
      apiRequest.mockResolvedValue(respuestaPerfil({ friendship: undefined }));

      const perfil = await repository.getPlayerProfile('u1');

      expect(perfil.friendship).toEqual({ status: 'NONE', friendshipId: null });
      expect(perfil.isFriend).toBe(false);
    });
  });

  describe('getPlayerActivity', () => {
    it('asks for a player activity page with its pagination', async () => {
      apiRequest.mockResolvedValue({ events: [], authors: {}, next_cursor: null, unseen_count: 0 });

      await repository.getPlayerActivity('u1', { limit: 10, cursor: 'c1' });

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/users/u1/activity?limit=10&cursor=c1');
    });

    it('omits the cursor on the first page', async () => {
      apiRequest.mockResolvedValue({ events: [], authors: {}, next_cursor: null, unseen_count: 0 });

      await repository.getPlayerActivity('u1');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/users/u1/activity?limit=20');
    });
  });

  describe('course names', () => {
    it('carries the course names that come beside the events', async () => {
      apiRequest.mockResolvedValue({
        events: [],
        authors: {},
        courses: { 'c-1': 'Real Club de Golf' },
        next_cursor: null,
        unseen_count: 0,
      });

      const page = await repository.getFeed({ limit: 20 });

      expect(page.courses).toEqual({ 'c-1': 'Real Club de Golf' });
    });

    it('falls back to an empty map when the response carries no courses', async () => {
      // Una respuesta de antes de BE #183 no trae `courses`. La página tiene que
      // pintarse igual, con las entradas sin nombre de campo.
      apiRequest.mockResolvedValue({ events: [], authors: {}, next_cursor: null, unseen_count: 0 });

      const page = await repository.getFeed({ limit: 20 });

      expect(page.courses).toEqual({});
    });
  });
});
