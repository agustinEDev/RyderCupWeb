import { describe, it, expect } from 'vitest';
import FriendshipMapper from './FriendshipMapper';
import { aExtras } from './conExtras';

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
      respuesta({
        created_at: '2026-09-23T23:55:00',
        responded_at: '2026-09-23T23:59:00.25',
      }),
    );

    expect(amistad.createdAt.toISOString()).toBe('2026-09-23T23:55:00.000Z');
    expect(amistad.respondedAt.toISOString()).toBe('2026-09-23T23:59:00.250Z');
  });

  it('sin respuesta, sigue sin fecha de respuesta', () => {
    const amistad = FriendshipMapper.toDomain(
      respuesta({ created_at: '2026-09-23T23:55:00' }),
    );

    expect(amistad.respondedAt).toBeNull();
  });
});

/** Lo que acompaña a la amistad para la pantalla, en camelCase y tal cual. */
describe('aExtras con la respuesta de Friendship', () => {
  it('traduce los nombres, alias, nombres reales y hándicaps de los dos lados', () => {
    expect(
      aExtras(
        respuesta({
          requester_name: 'Trinx',
          addressee_name: 'Rafa',
          requester_alias: 'Trinx',
          addressee_alias: null,
          requester_real_name: 'Agustín Estévez',
          addressee_real_name: '',
          requester_handicap: 12.4,
          addressee_handicap: 0,
        }),
      ),
    ).toMatchObject({
      requesterName: 'Trinx',
      addresseeName: 'Rafa',
      requesterAlias: 'Trinx',
      addresseeAlias: null,
      requesterRealName: 'Agustín Estévez',
      addresseeRealName: '',
      requesterHandicap: 12.4,
      addresseeHandicap: 0,
    });
  });

  it('sin datos de la API: null', () => {
    expect(aExtras(null)).toBeNull();
    expect(aExtras(undefined)).toBeNull();
  });

  it('lo que la API no manda queda undefined, sin valores por defecto', () => {
    const extras = aExtras(respuesta());

    for (const clave of [
      'addresseeAlias',
      'addresseeHandicap',
      'addresseeName',
      'addresseeRealName',
      'requesterAlias',
      'requesterHandicap',
      'requesterName',
      'requesterRealName',
    ])
      expect(extras[clave]).toBeUndefined();
  });
});
