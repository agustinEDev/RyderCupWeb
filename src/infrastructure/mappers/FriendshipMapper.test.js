import { describe, it, expect } from 'vitest';
import FriendshipMapper from './FriendshipMapper';

const respuesta = (extra = {}) => ({
  id: 'f-1',
  requester_id: 'user-1',
  addressee_id: 'user-2',
  status: 'ACCEPTED',
  ...extra,
});

/** La API fecha las amistades sin huso, en UTC (FE #710). */
describe('FriendshipMapper · horas sin huso', () => {
  it('lee created_at y responded_at como UTC', () => {
    const amistad = FriendshipMapper.toDomain(
      respuesta({ created_at: '2026-09-23T23:55:00', responded_at: '2026-09-23T23:59:00.25' })
    );

    expect(amistad.createdAt.toISOString()).toBe('2026-09-23T23:55:00.000Z');
    expect(amistad.respondedAt.toISOString()).toBe('2026-09-23T23:59:00.250Z');
  });

  it('sin respuesta, sigue sin fecha de respuesta', () => {
    const amistad = FriendshipMapper.toDomain(respuesta({ created_at: '2026-09-23T23:55:00' }));

    expect(amistad.respondedAt).toBeNull();
  });
});
