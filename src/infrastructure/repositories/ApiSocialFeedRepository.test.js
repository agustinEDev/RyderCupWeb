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

    it('says who put the block: blocked_by_me -> blockedByMe (social decisions, case 6)', async () => {
      apiRequest.mockResolvedValue(
        respuestaPerfil({ friendship: { status: 'BLOCKED', friendship_id: 'f1' }, blocked_by_me: false })
      );
      expect((await repository.getPlayerProfile('u1')).blockedByMe).toBe(false);

      apiRequest.mockResolvedValue(
        respuestaPerfil({ friendship: { status: 'BLOCKED', friendship_id: 'f1' }, blocked_by_me: true })
      );
      expect((await repository.getPlayerProfile('u1')).blockedByMe).toBe(true);
    });

    it('leaves blockedByMe as null when an older backend does not send it', async () => {
      apiRequest.mockResolvedValue(respuestaPerfil());
      expect((await repository.getPlayerProfile('u1')).blockedByMe).toBeNull();
    });

    it('keeps the private fields as null instead of turning them into zero', async () => {
      // Un cero se leería como "juega fatal" en vez de "esto no se puede ver".
      apiRequest.mockResolvedValue(respuestaPerfil());

      const perfil = await repository.getPlayerProfile('u1');

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
      // El correo de otro jugador no se enseña (21 oct): ni se trae al dominio
      expect(perfil).not.toHaveProperty('email');
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

  describe('setActivitySharing', () => {
    it('sends the new value and reports how much was removed', async () => {
      apiRequest.mockResolvedValue({ share_activity: false, removed_events: 7 });

      const result = await repository.setActivitySharing(false);

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/social/activity-sharing', {
        method: 'PUT',
        body: JSON.stringify({ enabled: false }),
      });
      expect(result).toEqual({ shareActivity: false, removedEvents: 7 });
    });

    it('defaults the removed count to zero when the response omits it', async () => {
      apiRequest.mockResolvedValue({ share_activity: true });

      const result = await repository.setActivitySharing(true);

      expect(result).toEqual({ shareActivity: true, removedEvents: 0 });
    });
  });

  describe('getUnseenCount (case 1-3)', () => {
    it('asks the light endpoint and returns the number', async () => {
      apiRequest.mockResolvedValue({ unseen_count: 4 });

      const n = await repository.getUnseenCount();

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/users/me/feed/unseen-count');
      expect(n).toBe(4);
    });

    it('reads a missing or broken number as zero', async () => {
      apiRequest.mockResolvedValue({});
      expect(await repository.getUnseenCount()).toBe(0);

      apiRequest.mockResolvedValue({ unseen_count: 'muchos' });
      expect(await repository.getUnseenCount()).toBe(0);
    });

    it('lets a failure through so the caller keeps the last value', async () => {
      apiRequest.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(repository.getUnseenCount()).rejects.toThrow('Failed to fetch');
    });
  });

  describe('getFeed with the redesign fields', () => {
    it('maps publication date, card key and the pending friend requests', async () => {
      apiRequest.mockResolvedValue({
        events: [
          {
            id: 'e1',
            user_id: 'u1',
            type: 'BIRDIE',
            occurred_at: '2026-10-22T12:00:00Z',
            published_at: '2026-10-22T17:00:00Z',
            payload: { count: 2 },
            source_match_id: 'm1',
            group_key: 'u1:m1',
          },
        ],
        authors: {
          u1: { id: 'u1', first_name: 'Ana', last_name: 'G', display_name: 'Ana G', avatar_source: 'PRESET' },
        },
        courses: {},
        next_cursor: null,
        unseen_count: 3,
        pending_friend_requests: [
          {
            friendship_id: 'f1',
            requester: {
              id: 'u9',
              first_name: 'Pedro',
              last_name: 'L',
              display_name: 'Pedro L',
              avatar_source: 'PRESET',
            },
            created_at: '2026-10-22T16:00:00Z',
          },
        ],
      });

      const page = await repository.getFeed({ limit: 20 });

      expect(page.events[0]).toMatchObject({
        id: 'e1',
        publishedAt: new Date('2026-10-22T17:00:00Z'),
        groupKey: 'u1:m1',
      });
      expect(page.unseenCount).toBe(3);
      expect(page.pendingFriendRequests).toEqual([
        { friendshipId: 'f1', requesterId: 'u9', createdAt: new Date('2026-10-22T16:00:00Z') },
      ]);
      // Quien pide amistad entra en los autores: la tarjeta pinta su nombre
      expect(page.authors.u9).toMatchObject({ id: 'u9', displayName: 'Pedro L' });
    });

    it('reads an instant without zone as UTC', async () => {
      apiRequest.mockResolvedValue({
        events: [
          {
            id: 'e1',
            user_id: 'u1',
            type: 'BIRDIE',
            occurred_at: '2026-10-22T12:00:00',
            published_at: '2026-10-22T17:00:00',
            source_match_id: 'm1',
          },
        ],
      });

      const page = await repository.getFeed();

      expect(page.events[0].publishedAt).toEqual(new Date('2026-10-22T17:00:00Z'));
      expect(page.events[0].occurredAt).toEqual(new Date('2026-10-22T12:00:00Z'));
    });

    it('defaults the new fields when an older backend omits them', async () => {
      apiRequest.mockResolvedValue({
        events: [{ id: 'e1', user_id: 'u1', type: 'BIRDIE', occurred_at: '2026-10-22T12:00:00Z', source_match_id: 'm1' }],
      });

      const page = await repository.getFeed();

      expect(page.events[0].publishedAt).toBeNull();
      expect(page.events[0].groupKey).toBeNull();
      expect(page.pendingFriendRequests).toEqual([]);
    });

    it('drops a request whose requester is missing', async () => {
      apiRequest.mockResolvedValue({
        events: [],
        pending_friend_requests: [{ friendship_id: 'f1', requester: null, created_at: '2026-10-22T16:00:00Z' }],
      });

      const page = await repository.getFeed();

      expect(page.pendingFriendRequests).toEqual([]);
    });
  });

  describe('head to head and games together (FE-2)', () => {
    const partida = (overrides = {}) => ({
      kind: 'QUICK_MATCH',
      id: 'g1',
      played_on: '2026-10-15',
      golf_course_id: 'c1',
      golf_course_name: 'El Saler',
      format: 'STABLEFORD',
      relation: 'AGAINST',
      result: 'WON',
      quick_match_id: 'g1',
      competition_id: null,
      competition_name: null,
      match_id: null,
      ...overrides,
    });

    it('maps the head to head of a friend, both sections', async () => {
      apiRequest.mockResolvedValue(
        respuestaPerfil({
          is_friend: true,
          head_to_head: {
            against: { won: 3, halved: 1, lost: 2 },
            alongside: { won: 1, halved: 0, lost: 4 },
          },
        })
      );

      const perfil = await repository.getPlayerProfile('u1');

      expect(perfil.headToHead).toEqual({
        against: { won: 3, halved: 1, lost: 2 },
        alongside: { won: 1, halved: 0, lost: 4 },
      });
    });

    it('keeps a section without games as null and the whole block null when absent', async () => {
      apiRequest.mockResolvedValueOnce(
        respuestaPerfil({ head_to_head: { against: { won: 1, halved: 0, lost: 0 }, alongside: null } })
      );
      const conUno = await repository.getPlayerProfile('u1');
      expect(conUno.headToHead).toEqual({ against: { won: 1, halved: 0, lost: 0 }, alongside: null });

      apiRequest.mockResolvedValueOnce(respuestaPerfil());
      const sinNada = await repository.getPlayerProfile('u1');
      expect(sinNada.headToHead).toBeNull();
      expect(sinNada.gamesTogether).toBeNull();
    });

    it('maps a tournament stroke play entry with both positions (J)', async () => {
      apiRequest.mockResolvedValue({
        games: [
          partida({
            kind: 'TOURNAMENT_STROKE_PLAY',
            id: 'comp9',
            played_on: '2026-10-25',
            golf_course_id: null,
            golf_course_name: null,
            format: 'MEDAL',
            relation: null,
            result: 'WON',
            quick_match_id: null,
            competition_id: 'comp9',
            competition_name: 'Liga de Otoño',
            my_position: 4,
            my_tied: true,
            their_position: 7,
            their_tied: false,
            total_players: 16,
          }),
        ],
        next_cursor: null,
      });

      const { games } = await repository.getGamesTogether('u1');

      expect(games[0]).toMatchObject({
        kind: 'TOURNAMENT_STROKE_PLAY',
        id: 'comp9',
        competitionId: 'comp9',
        competitionName: 'Liga de Otoño',
        golfCourseName: null,
        myPosition: 4,
        myTied: true,
        theirPosition: 7,
        theirTied: false,
        totalPlayers: 16,
      });
    });

    // H5 (25 oct 2026): el instante de la partida rápida, para su día local
    it('H5: played_at llega como playedAt (un instante); sin él, nulo', async () => {
      apiRequest.mockResolvedValue({
        games: [partida({ id: 'q1', played_at: '2026-10-21T22:30:00Z' }), partida({ id: 'q2' })],
        next_cursor: null,
      });

      const { games } = await repository.getGamesTogether('u1');

      expect(games[0].playedAt.toISOString()).toBe('2026-10-21T22:30:00.000Z');
      expect(games[1].playedAt).toBeNull();
    });

    it('leaves the positions null for the other kinds', async () => {
      apiRequest.mockResolvedValue({ games: [partida()], next_cursor: null });

      const { games } = await repository.getGamesTogether('u1');

      expect(games[0]).toMatchObject({
        myPosition: null,
        myTied: false,
        theirPosition: null,
        theirTied: false,
        totalPlayers: null,
      });
    });

    it('maps the first page of games together to camelCase', async () => {
      apiRequest.mockResolvedValue(
        respuestaPerfil({
          games_together: {
            games: [
              partida(),
              partida({
                kind: 'TOURNAMENT_GROUP',
                id: 'g2',
                played_on: '2026-10-01',
                format: 'MEDAL',
                relation: 'AGAINST',
                result: null,
                quick_match_id: null,
                competition_id: 'comp1',
                competition_name: 'Liga',
                match_id: 'g2',
              }),
            ],
            next_cursor: '2026-10-01|g2',
          },
        })
      );

      const perfil = await repository.getPlayerProfile('u1');

      expect(perfil.gamesTogether.nextCursor).toBe('2026-10-01|g2');
      expect(perfil.gamesTogether.games).toEqual([
        {
          kind: 'QUICK_MATCH',
          id: 'g1',
          playedOn: '2026-10-15',
          playedAt: null,
          golfCourseId: 'c1',
          golfCourseName: 'El Saler',
          format: 'STABLEFORD',
          relation: 'AGAINST',
          result: 'WON',
          quickMatchId: 'g1',
          competitionId: null,
          competitionName: null,
          matchId: null,
          myPosition: null,
          myTied: false,
          theirPosition: null,
          theirTied: false,
          totalPlayers: null,
        },
        {
          kind: 'TOURNAMENT_GROUP',
          id: 'g2',
          playedOn: '2026-10-01',
          playedAt: null,
          golfCourseId: 'c1',
          golfCourseName: 'El Saler',
          format: 'MEDAL',
          relation: 'AGAINST',
          result: null,
          quickMatchId: null,
          competitionId: 'comp1',
          competitionName: 'Liga',
          matchId: 'g2',
          myPosition: null,
          myTied: false,
          theirPosition: null,
          theirTied: false,
          totalPlayers: null,
        },
      ]);
    });

    it('asks for the next page of games together with the cursor, encoded', async () => {
      apiRequest.mockResolvedValue({ games: [partida({ id: 'g9', quick_match_id: 'g9' })], next_cursor: null });

      const page = await repository.getGamesTogether('u1', { cursor: '2026-10-01|g2' });

      expect(apiRequest).toHaveBeenCalledWith(
        '/api/v1/users/u1/games-together?cursor=2026-10-01%7Cg2'
      );
      expect(page.games.map((g) => g.id)).toEqual(['g9']);
      expect(page.nextCursor).toBeNull();
    });

    it('omits the cursor on the first page of games together and survives an empty body', async () => {
      apiRequest.mockResolvedValue({});

      const page = await repository.getGamesTogether('u1');

      expect(apiRequest).toHaveBeenCalledWith('/api/v1/users/u1/games-together');
      expect(page).toEqual({ games: [], nextCursor: null });
    });
  });
});
