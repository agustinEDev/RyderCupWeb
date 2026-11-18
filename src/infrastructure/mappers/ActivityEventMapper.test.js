import { describe, it, expect } from 'vitest';
import ActivityEventMapper from './ActivityEventMapper';

const apiAuthor = (overrides = {}) => ({
  id: 'u-1',
  first_name: 'Ana',
  last_name: 'García',
  display_name: 'Anita',
  alias: 'Anita',
  avatar_source: 'preset',
  avatar_preset_id: 'preset-3',
  ...overrides,
});

const apiEvent = (overrides = {}) => ({
  id: 'ev-1',
  user_id: 'u-1',
  type: 'BIRDIES',
  occurred_at: '2026-09-23T23:55:00Z',
  published_at: '2026-09-24T10:00:00Z',
  payload: { count: 2, holes: [3, 7] },
  source_match_id: 'm-1',
  group_key: 'round-1',
  ...overrides,
});

describe('ActivityEventMapper.toDomain', () => {
  it('maps every field of a feed entry to camelCase', () => {
    const result = ActivityEventMapper.toDomain(apiEvent());

    expect(result).toEqual({
      id: 'ev-1',
      userId: 'u-1',
      type: 'BIRDIES',
      occurredAt: new Date('2026-09-23T23:55:00Z'),
      publishedAt: new Date('2026-09-24T10:00:00Z'),
      payload: { count: 2, holes: [3, 7] },
      sourceMatchId: 'm-1',
      groupKey: 'round-1',
    });
  });

  it('passes the payload through untouched (same reference)', () => {
    const payload = { nested: { course_id: 'c-1' } };
    expect(ActivityEventMapper.toDomain(apiEvent({ payload })).payload).toBe(
      payload,
    );
  });

  it('reads an instant without time zone as UTC', () => {
    const result = ActivityEventMapper.toDomain(
      apiEvent({ occurred_at: '2026-09-23T23:55:00' }),
    );
    expect(result.occurredAt.toISOString()).toBe('2026-09-23T23:55:00.000Z');
  });

  it('respects an explicit offset', () => {
    const result = ActivityEventMapper.toDomain(
      apiEvent({ published_at: '2026-09-24T12:00:00+02:00' }),
    );
    expect(result.publishedAt.toISOString()).toBe('2026-09-24T10:00:00.000Z');
  });

  it('defaults missing optional fields to null / empty payload', () => {
    const result = ActivityEventMapper.toDomain({
      id: 'ev-2',
      user_id: 'u-2',
      type: 'ROUND',
    });

    expect(result.occurredAt).toBeNull();
    expect(result.publishedAt).toBeNull();
    expect(result.payload).toEqual({});
    expect(result.sourceMatchId).toBeNull();
    expect(result.groupKey).toBeNull();
  });

  it('turns explicit nulls into null / empty payload', () => {
    const result = ActivityEventMapper.toDomain(
      apiEvent({
        occurred_at: null,
        published_at: '',
        payload: null,
        source_match_id: null,
        group_key: null,
      }),
    );

    expect(result.occurredAt).toBeNull();
    expect(result.publishedAt).toBeNull();
    expect(result.payload).toEqual({});
    expect(result.sourceMatchId).toBeNull();
    expect(result.groupKey).toBeNull();
  });

  it('returns null (not an Invalid Date) for an unreadable instant', () => {
    const result = ActivityEventMapper.toDomain(
      apiEvent({ occurred_at: 'not-a-date', published_at: '2026-13-45T99:00' }),
    );
    expect(result.occurredAt).toBeNull();
    expect(result.publishedAt).toBeNull();
  });
});

describe('ActivityEventMapper.authorToDomain', () => {
  it('maps every field of an author', () => {
    expect(ActivityEventMapper.authorToDomain(apiAuthor())).toEqual({
      id: 'u-1',
      firstName: 'Ana',
      lastName: 'García',
      displayName: 'Anita',
      alias: 'Anita',
      avatarSource: 'preset',
      avatarPresetId: 'preset-3',
    });
  });

  it('turns an empty display name into null and a missing alias into null', () => {
    const author = apiAuthor({ display_name: '' });
    delete author.alias;

    const result = ActivityEventMapper.authorToDomain(author);
    expect(result.displayName).toBeNull();
    expect(result.alias).toBeNull();
  });

  it('keeps missing avatar fields as undefined (no default)', () => {
    const result = ActivityEventMapper.authorToDomain({
      id: 'u-9',
      first_name: 'Luis',
      last_name: 'Pérez',
    });
    expect(result.avatarSource).toBeUndefined();
    expect(result.avatarPresetId).toBeUndefined();
    expect(result.displayName).toBeNull();
  });
});

describe('ActivityEventMapper.feedToDomain', () => {
  it('maps a full page: events, authors, courses, cursor and unseen count', () => {
    const result = ActivityEventMapper.feedToDomain({
      events: [apiEvent(), apiEvent({ id: 'ev-2', user_id: 'u-2' })],
      authors: {
        'u-1': apiAuthor(),
        'u-2': apiAuthor({ id: 'u-2', first_name: 'Luis' }),
      },
      courses: { 'c-1': 'Club de Campo' },
      next_cursor: 'cursor-abc',
      unseen_count: 4,
      pending_friend_requests: [],
    });

    expect(result.events.map((e) => e.id)).toEqual(['ev-1', 'ev-2']);
    expect(result.events[1].userId).toBe('u-2');
    expect(Object.keys(result.authors)).toEqual(['u-1', 'u-2']);
    expect(result.authors['u-2'].firstName).toBe('Luis');
    expect(result.authors['u-1'].displayName).toBe('Anita');
    expect(result.courses).toEqual({ 'c-1': 'Club de Campo' });
    expect(result.nextCursor).toBe('cursor-abc');
    expect(result.unseenCount).toBe(4);
    expect(result.pendingFriendRequests).toEqual([]);
  });

  it('returns empty defaults for an empty response', () => {
    expect(ActivityEventMapper.feedToDomain({})).toEqual({
      events: [],
      authors: {},
      courses: {},
      nextCursor: null,
      unseenCount: 0,
      pendingFriendRequests: [],
    });
  });

  it('returns empty defaults when the lists come as null', () => {
    const result = ActivityEventMapper.feedToDomain({
      events: null,
      authors: null,
      courses: null,
      next_cursor: null,
      unseen_count: null,
      pending_friend_requests: null,
    });
    expect(result.events).toEqual([]);
    expect(result.authors).toEqual({});
    expect(result.courses).toEqual({});
    expect(result.nextCursor).toBeNull();
    expect(result.unseenCount).toBe(0);
    expect(result.pendingFriendRequests).toEqual([]);
  });

  it('keeps an unseen count of 0 (not replaced by a default)', () => {
    expect(
      ActivityEventMapper.feedToDomain({ unseen_count: 0 }).unseenCount,
    ).toBe(0);
  });

  it('maps pending friend requests and adds the requester to the authors', () => {
    const result = ActivityEventMapper.feedToDomain({
      pending_friend_requests: [
        {
          friendship_id: 'f-1',
          requester: apiAuthor({ id: 'u-7', first_name: 'Marta' }),
          created_at: '2026-10-01T08:00:00',
        },
      ],
    });

    expect(result.pendingFriendRequests).toEqual([
      {
        friendshipId: 'f-1',
        requesterId: 'u-7',
        createdAt: new Date('2026-10-01T08:00:00Z'),
      },
    ]);
    expect(result.authors['u-7']).toEqual(
      expect.objectContaining({ id: 'u-7', firstName: 'Marta' }),
    );
  });

  it('does not overwrite an author already present in the page', () => {
    const result = ActivityEventMapper.feedToDomain({
      authors: { 'u-1': apiAuthor({ first_name: 'Del feed' }) },
      pending_friend_requests: [
        {
          friendship_id: 'f-1',
          requester: apiAuthor({ first_name: 'De la solicitud' }),
          created_at: null,
        },
      ],
    });

    expect(result.authors['u-1'].firstName).toBe('Del feed');
    expect(result.pendingFriendRequests[0].createdAt).toBeNull();
  });

  it('discards requests without friendship id or without requester id', () => {
    const result = ActivityEventMapper.feedToDomain({
      pending_friend_requests: [
        null,
        { requester: apiAuthor({ id: 'u-a' }) },
        { friendship_id: 'f-2' },
        { friendship_id: 'f-3', requester: { first_name: 'Sin id' } },
        { friendship_id: 'f-4', requester: apiAuthor({ id: 'u-b' }) },
      ],
    });

    expect(result.pendingFriendRequests.map((r) => r.friendshipId)).toEqual([
      'f-4',
    ]);
    // Los descartados no meten autor
    expect(Object.keys(result.authors)).toEqual(['u-b']);
  });
});
