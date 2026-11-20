import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiFriendRepository from './ApiFriendRepository';
import IFriendRepository from '../../domain/repositories/IFriendRepository';
import Friendship from '../../domain/entities/Friendship';
import { RutaDeLaApiNoValida } from '../http/rutaDeLaApi';
import * as apiModule from '../http/api';
import { aExtras } from '../mappers/conExtras';

vi.mock('../http/api', async () => ({
  segmento: (await vi.importActual('../http/rutaDeLaApi')).segmento,
  default: vi.fn(),
}));

const apiFriendship = (overrides = {}) => ({
  id: 'f-1',
  requester_id: 'u-1',
  addressee_id: 'u-2',
  status: 'PENDING',
  responded_at: null,
  created_at: '2026-10-01T08:00:00',
  updated_at: '2026-10-01T08:00:00Z',
  ...overrides,
});

describe('ApiFriendRepository', () => {
  let repository;
  let apiRequestMock;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ApiFriendRepository();
    apiRequestMock = apiModule.default;
  });

  it('implements IFriendRepository', () => {
    expect(repository).toBeInstanceOf(IFriendRepository);
  });

  describe('sendRequest', () => {
    it('POSTs the addressee id and maps the friendship', async () => {
      const apiData = apiFriendship();
      apiRequestMock.mockResolvedValue(apiData);

      const { entity: result, extras } = await repository.sendRequest('u-2');

      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/friends/requests', {
        method: 'POST',
        body: JSON.stringify({ addressee_id: 'u-2' }),
      });
      expect(result).toBeInstanceOf(Friendship);
      expect(result.id).toBe('f-1');
      expect(result.requesterId).toBe('u-1');
      expect(result.addresseeId).toBe('u-2');
      expect(result.isPending()).toBe(true);
      expect(result.respondedAt).toBeNull();
      // Sin huso se lee como UTC
      expect(result.createdAt.toISOString()).toBe('2026-10-01T08:00:00.000Z');
      expect(extras).toEqual(aExtras(apiData));
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('Conflict');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.sendRequest('u-2')).rejects.toBe(error);
    });

    it('rejects when the response lacks the required fields', async () => {
      apiRequestMock.mockResolvedValue({ id: 'f-1' });
      await expect(repository.sendRequest('u-2')).rejects.toThrow(
        /Missing required fields/,
      );
    });
  });

  describe('respondToRequest', () => {
    it('POSTs the action to the encoded friendship and maps the answer', async () => {
      const apiData = apiFriendship({
        id: 'f 1',
        status: 'ACCEPTED',
        responded_at: '2026-10-02T09:30:00Z',
      });
      apiRequestMock.mockResolvedValue(apiData);

      const { entity: result, extras } = await repository.respondToRequest(
        'f 1',
        'ACCEPT',
      );

      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/v1/friends/requests/f%201/respond',
        { method: 'POST', body: JSON.stringify({ action: 'ACCEPT' }) },
      );
      expect(result.isAccepted()).toBe(true);
      expect(result.respondedAt).toEqual(new Date('2026-10-02T09:30:00Z'));
      expect(extras).toEqual(aExtras(apiData));
    });

    it('rejects an id that would change the path, without calling the API', async () => {
      await expect(
        repository.respondToRequest('..', 'ACCEPT'),
      ).rejects.toBeInstanceOf(RutaDeLaApiNoValida);
      expect(apiRequestMock).not.toHaveBeenCalled();
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('Forbidden');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.respondToRequest('f-1', 'DECLINE')).rejects.toBe(
        error,
      );
    });
  });

  describe('removeFriend', () => {
    it('DELETEs the friendship and resolves to undefined', async () => {
      apiRequestMock.mockResolvedValue({ ignored: true });

      const result = await repository.removeFriend('f-1');

      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/friends/f-1', {
        method: 'DELETE',
      });
      expect(result).toBeUndefined();
    });

    it('rejects an id with a slash, without calling the API', async () => {
      await expect(repository.removeFriend('a/b')).rejects.toBeInstanceOf(
        RutaDeLaApiNoValida,
      );
      expect(apiRequestMock).not.toHaveBeenCalled();
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('Not found');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.removeFriend('f-1')).rejects.toBe(error);
    });
  });

  describe('blockUser', () => {
    it('POSTs to the block endpoint without body and maps the friendship', async () => {
      const apiData = apiFriendship({
        status: 'BLOCKED',
        addressee_name: 'Rafa',
      });
      apiRequestMock.mockResolvedValue(apiData);

      const { entity: result, extras } = await repository.blockUser('u-2');

      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/friends/u-2/block', {
        method: 'POST',
      });
      expect(result.isBlocked()).toBe(true);
      expect(extras.addresseeName).toBe('Rafa');
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('HTTP 500');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.blockUser('u-2')).rejects.toBe(error);
    });
  });

  describe('getFriends', () => {
    it('GETs /friends/me without query string when there are no filters', async () => {
      apiRequestMock.mockResolvedValue({ friendships: [], total_count: 0 });

      const result = await repository.getFriends();

      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/friends/me');
      expect(result).toEqual({ friendships: [], totalCount: 0 });
    });

    it('sends only page and limit, encoded as query string', async () => {
      apiRequestMock.mockResolvedValue({ friendships: [] });

      await repository.getFriends({ page: 2, limit: 50, direction: 'x' });

      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/v1/friends/me?page=2&limit=50',
      );
    });

    it('encodes filter values in the query string', async () => {
      apiRequestMock.mockResolvedValue({ friendships: [] });

      await repository.getFriends({ page: 'a&b=c', limit: '1 0' });

      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/v1/friends/me?page=a%26b%3Dc&limit=1+0',
      );
    });

    it('omits falsy page and limit', async () => {
      apiRequestMock.mockResolvedValue({ friendships: [] });

      await repository.getFriends({ page: 0, limit: null });

      expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/friends/me');
    });

    it('maps each friendship with its extras', async () => {
      const raw = [
        apiFriendship({ id: 'f-1', status: 'ACCEPTED', addressee_name: 'Ana' }),
        apiFriendship({
          id: 'f-2',
          status: 'ACCEPTED',
          addressee_id: 'u-3',
          addressee_handicap: 7.5,
        }),
      ];
      apiRequestMock.mockResolvedValue({ friendships: raw, total_count: 12 });

      const result = await repository.getFriends({ page: 1 });

      expect(result.totalCount).toBe(12);
      expect(result.friendships).toHaveLength(2);
      const entities = result.friendships.map((f) => f.entity);
      expect(entities.every((f) => f instanceof Friendship)).toBe(true);
      expect(entities.map((f) => f.id)).toEqual(['f-1', 'f-2']);
      expect(entities[1].addresseeId).toBe('u-3');
      expect(result.friendships[0].extras.addresseeName).toBe('Ana');
      expect(result.friendships[1].extras.addresseeHandicap).toBe(7.5);
    });

    it('defaults to an empty list and zero total when the fields are missing', async () => {
      apiRequestMock.mockResolvedValue({});
      expect(await repository.getFriends()).toEqual({
        friendships: [],
        totalCount: 0,
      });
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('Unauthorized');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.getFriends()).rejects.toBe(error);
    });
  });

  describe('getPendingRequests', () => {
    it('GETs /friends/requests/me with the direction', async () => {
      apiRequestMock.mockResolvedValue({ friendships: [], total_count: 0 });

      await repository.getPendingRequests('incoming');

      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/v1/friends/requests/me?direction=incoming',
      );
    });

    it('adds page and limit after the direction', async () => {
      apiRequestMock.mockResolvedValue({ friendships: [] });

      await repository.getPendingRequests('outgoing', { page: 3, limit: 10 });

      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/v1/friends/requests/me?direction=outgoing&page=3&limit=10',
      );
    });

    it('omits an empty, null or undefined direction', async () => {
      apiRequestMock.mockResolvedValue({ friendships: [] });

      await repository.getPendingRequests('');
      await repository.getPendingRequests(null);
      await repository.getPendingRequests(undefined, { limit: 5 });

      expect(apiRequestMock.mock.calls.map((c) => c[0])).toEqual([
        '/api/v1/friends/requests/me',
        '/api/v1/friends/requests/me',
        '/api/v1/friends/requests/me?limit=5',
      ]);
    });

    it('encodes the direction', async () => {
      apiRequestMock.mockResolvedValue({ friendships: [] });

      await repository.getPendingRequests('in&page=99');

      expect(apiRequestMock).toHaveBeenCalledWith(
        '/api/v1/friends/requests/me?direction=in%26page%3D99',
      );
    });

    it('maps the requests with their extras', async () => {
      const raw = [apiFriendship({ id: 'f-9', requester_alias: 'Trinx' })];
      apiRequestMock.mockResolvedValue({ friendships: raw, total_count: 1 });

      const result = await repository.getPendingRequests('incoming');

      expect(result.totalCount).toBe(1);
      const { entity, extras } = result.friendships[0];
      expect(entity).toBeInstanceOf(Friendship);
      expect(entity.id).toBe('f-9');
      expect(entity.isPending()).toBe(true);
      expect(extras.requesterAlias).toBe('Trinx');
    });

    it('defaults to an empty list and zero total when the fields are null', async () => {
      apiRequestMock.mockResolvedValue({
        friendships: null,
        total_count: null,
      });
      expect(await repository.getPendingRequests('incoming')).toEqual({
        friendships: [],
        totalCount: 0,
      });
    });

    it('propagates the HTTP error', async () => {
      const error = new Error('HTTP 503');
      apiRequestMock.mockRejectedValue(error);
      await expect(repository.getPendingRequests('incoming')).rejects.toBe(
        error,
      );
    });
  });
});
