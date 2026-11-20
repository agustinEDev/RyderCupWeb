import { describe, it, expect } from 'vitest';
import FriendshipAssembler from './FriendshipAssembler';
import FriendshipMapper from '../../infrastructure/mappers/FriendshipMapper';
import { aExtras } from '../../infrastructure/mappers/conExtras';

/**
 * El hándicap del amigo, para el resumen del asistente de partida rápida
 * antes de crear nada (FE #848): el del OTRO lado de la amistad, y nulo
 * cuando no tiene o el servidor no lo manda.
 */
const api = (extra = {}) => ({
  id: 'f-1',
  requester_id: 'user-1',
  requester_name: 'Yo',
  addressee_id: 'user-2',
  addressee_name: 'Rafa',
  status: 'ACCEPTED',
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
  ...extra,
});
const dto = (apiData, yo) =>
  FriendshipAssembler.toSimpleDTO(
    FriendshipMapper.toDomain(apiData),
    aExtras(apiData),
    yo,
  );

describe('FriendshipAssembler · hándicap del amigo (FE #848)', () => {
  it('el del otro lado, sea quien sea quien pidió la amistad', () => {
    const datos = api({ requester_handicap: 12.4, addressee_handicap: 20.1 });

    expect(dto(datos, 'user-1').otherUserHandicap).toBe(20.1);
    expect(dto(datos, 'user-2').otherUserHandicap).toBe(12.4);
  });

  it('sin hándicap, o un servidor que no lo manda: null', () => {
    expect(
      dto(api({ addressee_handicap: null }), 'user-1').otherUserHandicap,
    ).toBeNull();
    expect(dto(api(), 'user-1').otherUserHandicap).toBeNull();
  });

  it('el hándicap 0 es un hándicap', () => {
    expect(
      dto(api({ addressee_handicap: 0 }), 'user-1').otherUserHandicap,
    ).toBe(0);
  });
});

describe('FriendshipAssembler · el otro nombre del otro lado (SB-08)', () => {
  it('con alias delante, su nombre real pequeño debajo', () => {
    const datos = api({
      addressee_name: 'Trinx',
      addressee_real_name: 'Agustín Estévez',
      addressee_alias: 'Trinx',
    });

    expect(dto(datos, 'user-1').otherUserSubName).toBe('Agustín Estévez');
  });

  it('si la pidió el otro (solicitud recibida), el nombre real de quien la pidió', () => {
    const datos = api({
      requester_name: 'Trinx',
      requester_real_name: 'Agustín Estévez',
      requester_alias: 'Trinx',
      addressee_real_name: 'Yo Mismo',
    });

    expect(dto(datos, 'user-2').otherUserSubName).toBe('Agustín Estévez');
  });

  it('sin alias, o un servidor que no los manda: null', () => {
    expect(
      dto(api({ addressee_real_name: 'Rafa Nadal' }), 'user-1')
        .otherUserSubName,
    ).toBeNull();
    expect(dto(api(), 'user-1').otherUserSubName).toBeNull();
  });
});
