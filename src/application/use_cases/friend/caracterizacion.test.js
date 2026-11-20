import { describe, it, expect, beforeEach, vi } from 'vitest';
import ApiFriendRepository from '../../../infrastructure/repositories/ApiFriendRepository';
import * as apiModule from '../../../infrastructure/http/api';
import SendFriendRequestUseCase from './SendFriendRequestUseCase';
import RespondFriendRequestUseCase from './RespondFriendRequestUseCase';
import BlockUserUseCase from './BlockUserUseCase';
import ListFriendsUseCase from './ListFriendsUseCase';
import ListPendingFriendRequestsUseCase from './ListPendingFriendRequestsUseCase';

/**
 * EXCEPCIÓN DELIBERADA a «mockear repositorios en los tests de casos de uso»
 * (CLAUDE.md): aquí el repositorio es el real a propósito, con `apiRequest`
 * simulado. Con un repositorio simulado no se vería lo que cambia entre la
 * respuesta de la API y el DTO, que es justo lo que este test vigila.
 *
 * Caracterización: lo que devuelve cada caso de uso de amistades con el
 * repositorio REAL y la API simulada. Fija el DTO de hoy, campos opcionales
 * incluidos, para que cambiar cómo viajan los datos extra de la API no cambie
 * nada de lo que ve la pantalla.
 */
vi.mock('../../../infrastructure/http/api', async () => ({
  segmento: (await vi.importActual('../../../infrastructure/http/rutaDeLaApi'))
    .segmento,
  default: vi.fn(),
}));

const completa = (extra = {}) => ({
  id: 'f-1',
  requester_id: 'u-1',
  requester_name: 'Trinx',
  requester_alias: 'Trinx',
  requester_real_name: 'Agustín Estévez',
  requester_handicap: 12.4,
  addressee_id: 'u-2',
  addressee_name: 'Rafa',
  addressee_alias: null,
  addressee_real_name: 'Rafa Nadal',
  addressee_handicap: 0,
  status: 'ACCEPTED',
  responded_at: '2026-10-02T09:30:00Z',
  created_at: '2026-10-01T08:00:00',
  updated_at: '2026-10-01T08:00:00Z',
  ...extra,
});

/** Solo lo obligatorio: ni nombres, ni alias, ni hándicap, ni fechas. */
const minima = (extra = {}) => ({
  id: 'f-2',
  requester_id: 'u-1',
  addressee_id: 'u-2',
  status: 'PENDING',
  ...extra,
});

describe('Caracterización · casos de uso de amistades', () => {
  let friendRepository;
  let api;

  beforeEach(() => {
    vi.clearAllMocks();
    friendRepository = new ApiFriendRepository();
    api = apiModule.default;
  });

  describe('SendFriendRequestUseCase', () => {
    it('respuesta completa', async () => {
      api.mockResolvedValue(
        completa({ status: 'PENDING', responded_at: null }),
      );
      const dto = await new SendFriendRequestUseCase({
        friendRepository,
      }).execute('u-2');
      expect(dto).toMatchInlineSnapshot(`
        {
          "addresseeId": "u-2",
          "addresseeName": "Rafa",
          "createdAt": "2026-10-01T08:00:00.000Z",
          "id": "f-1",
          "isAccepted": false,
          "isBlocked": false,
          "isDeclined": false,
          "isPending": true,
          "requesterId": "u-1",
          "requesterName": "Trinx",
          "respondedAt": null,
          "status": "PENDING",
          "updatedAt": "2026-10-01T08:00:00.000Z",
        }
      `);
    });

    it('nombres vacíos o nulos', async () => {
      api.mockResolvedValue(
        minima({
          requester_name: '',
          addressee_name: null,
          created_at: '2026-10-01T08:00:00Z',
          updated_at: '2026-10-01T08:00:00Z',
        }),
      );
      const dto = await new SendFriendRequestUseCase({
        friendRepository,
      }).execute('u-2');
      expect(dto).toMatchInlineSnapshot(`
        {
          "addresseeId": "u-2",
          "createdAt": "2026-10-01T08:00:00.000Z",
          "id": "f-2",
          "isAccepted": false,
          "isBlocked": false,
          "isDeclined": false,
          "isPending": true,
          "requesterId": "u-1",
          "respondedAt": null,
          "status": "PENDING",
          "updatedAt": "2026-10-01T08:00:00.000Z",
        }
      `);
    });
  });

  describe('RespondFriendRequestUseCase', () => {
    it('respuesta completa', async () => {
      api.mockResolvedValue(completa());
      const dto = await new RespondFriendRequestUseCase({
        friendRepository,
      }).execute('f-1', 'ACCEPT');
      expect(dto).toMatchInlineSnapshot(`
        {
          "addresseeId": "u-2",
          "addresseeName": "Rafa",
          "createdAt": "2026-10-01T08:00:00.000Z",
          "id": "f-1",
          "isAccepted": true,
          "isBlocked": false,
          "isDeclined": false,
          "isPending": false,
          "requesterId": "u-1",
          "requesterName": "Trinx",
          "respondedAt": "2026-10-02T09:30:00.000Z",
          "status": "ACCEPTED",
          "updatedAt": "2026-10-01T08:00:00.000Z",
        }
      `);
    });

    it('solo el nombre de quien la recibe', async () => {
      api.mockResolvedValue(
        minima({
          status: 'DECLINED',
          addressee_name: 'Rafa',
          created_at: '2026-10-01T08:00:00Z',
          updated_at: '2026-10-01T08:00:00Z',
        }),
      );
      const dto = await new RespondFriendRequestUseCase({
        friendRepository,
      }).execute('f-2', 'DECLINE');
      expect(dto).toMatchInlineSnapshot(`
        {
          "addresseeId": "u-2",
          "addresseeName": "Rafa",
          "createdAt": "2026-10-01T08:00:00.000Z",
          "id": "f-2",
          "isAccepted": false,
          "isBlocked": false,
          "isDeclined": true,
          "isPending": false,
          "requesterId": "u-1",
          "respondedAt": null,
          "status": "DECLINED",
          "updatedAt": "2026-10-01T08:00:00.000Z",
        }
      `);
    });
  });

  describe('BlockUserUseCase', () => {
    it('respuesta completa', async () => {
      api.mockResolvedValue(completa({ status: 'BLOCKED' }));
      const dto = await new BlockUserUseCase({ friendRepository }).execute(
        'u-2',
      );
      expect(dto).toMatchInlineSnapshot(`
        {
          "addresseeId": "u-2",
          "addresseeName": "Rafa",
          "createdAt": "2026-10-01T08:00:00.000Z",
          "id": "f-1",
          "isAccepted": false,
          "isBlocked": true,
          "isDeclined": false,
          "isPending": false,
          "requesterId": "u-1",
          "requesterName": "Trinx",
          "respondedAt": "2026-10-02T09:30:00.000Z",
          "status": "BLOCKED",
          "updatedAt": "2026-10-01T08:00:00.000Z",
        }
      `);
    });

    it('solo el nombre de quien bloquea', async () => {
      api.mockResolvedValue(
        minima({
          status: 'BLOCKED',
          requester_name: 'Trinx',
          created_at: '2026-10-01T08:00:00Z',
          updated_at: '2026-10-01T08:00:00Z',
        }),
      );
      const dto = await new BlockUserUseCase({ friendRepository }).execute(
        'u-2',
      );
      expect(dto).toMatchInlineSnapshot(`
        {
          "addresseeId": "u-2",
          "createdAt": "2026-10-01T08:00:00.000Z",
          "id": "f-2",
          "isAccepted": false,
          "isBlocked": true,
          "isDeclined": false,
          "isPending": false,
          "requesterId": "u-1",
          "requesterName": "Trinx",
          "respondedAt": null,
          "status": "BLOCKED",
          "updatedAt": "2026-10-01T08:00:00.000Z",
        }
      `);
    });
  });

  describe('ListFriendsUseCase', () => {
    it('visto desde quien pidió y desde quien recibió', async () => {
      api.mockResolvedValue({
        friendships: [
          completa(),
          completa({
            id: 'f-3',
            requester_id: 'u-3',
            requester_name: 'Pepe',
            requester_alias: 'Pepito',
            requester_real_name: 'José García',
            requester_handicap: 20.1,
            addressee_id: 'u-1',
            addressee_name: 'Trinx',
            addressee_alias: 'Trinx',
            addressee_real_name: 'Agustín Estévez',
            addressee_handicap: 12.4,
          }),
        ],
        total_count: 7,
      });
      const result = await new ListFriendsUseCase({
        friendRepository,
      }).execute('u-1', { page: 1 });
      expect(result).toMatchInlineSnapshot(`
        {
          "friendships": [
            {
              "addresseeId": "u-2",
              "addresseeName": "Rafa",
              "createdAt": "2026-10-01T08:00:00.000Z",
              "id": "f-1",
              "isAccepted": true,
              "isBlocked": false,
              "isDeclined": false,
              "isPending": false,
              "isSentByMe": true,
              "otherUserHandicap": 0,
              "otherUserId": "u-2",
              "otherUserName": "Rafa",
              "otherUserSubName": null,
              "requesterId": "u-1",
              "requesterName": "Trinx",
              "respondedAt": "2026-10-02T09:30:00.000Z",
              "status": "ACCEPTED",
              "updatedAt": "2026-10-01T08:00:00.000Z",
            },
            {
              "addresseeId": "u-1",
              "addresseeName": "Trinx",
              "createdAt": "2026-10-01T08:00:00.000Z",
              "id": "f-3",
              "isAccepted": true,
              "isBlocked": false,
              "isDeclined": false,
              "isPending": false,
              "isSentByMe": false,
              "otherUserHandicap": 20.1,
              "otherUserId": "u-3",
              "otherUserName": "Pepe",
              "otherUserSubName": null,
              "requesterId": "u-3",
              "requesterName": "Pepe",
              "respondedAt": "2026-10-02T09:30:00.000Z",
              "status": "ACCEPTED",
              "updatedAt": "2026-10-01T08:00:00.000Z",
            },
          ],
          "totalCount": 7,
        }
      `);
    });

    it('sin campos opcionales, con nulos y sin usuario actual', async () => {
      api.mockResolvedValue({
        friendships: [
          minima({
            status: 'ACCEPTED',
            created_at: '2026-10-01T08:00:00Z',
            updated_at: '2026-10-01T08:00:00Z',
          }),
          minima({
            id: 'f-4',
            status: 'ACCEPTED',
            requester_name: null,
            requester_alias: null,
            requester_real_name: null,
            requester_handicap: null,
            addressee_name: '',
            addressee_alias: '',
            addressee_real_name: '',
            addressee_handicap: null,
            created_at: '2026-10-01T08:00:00Z',
            updated_at: '2026-10-01T08:00:00Z',
          }),
        ],
      });
      const conYo = await new ListFriendsUseCase({
        friendRepository,
      }).execute('u-2');
      expect(conYo).toMatchInlineSnapshot(`
        {
          "friendships": [
            {
              "addresseeId": "u-2",
              "createdAt": "2026-10-01T08:00:00.000Z",
              "id": "f-2",
              "isAccepted": true,
              "isBlocked": false,
              "isDeclined": false,
              "isPending": false,
              "isSentByMe": false,
              "otherUserHandicap": null,
              "otherUserId": "u-1",
              "otherUserName": undefined,
              "otherUserSubName": null,
              "requesterId": "u-1",
              "respondedAt": null,
              "status": "ACCEPTED",
              "updatedAt": "2026-10-01T08:00:00.000Z",
            },
            {
              "addresseeId": "u-2",
              "createdAt": "2026-10-01T08:00:00.000Z",
              "id": "f-4",
              "isAccepted": true,
              "isBlocked": false,
              "isDeclined": false,
              "isPending": false,
              "isSentByMe": false,
              "otherUserHandicap": null,
              "otherUserId": "u-1",
              "otherUserName": undefined,
              "otherUserSubName": null,
              "requesterId": "u-1",
              "respondedAt": null,
              "status": "ACCEPTED",
              "updatedAt": "2026-10-01T08:00:00.000Z",
            },
          ],
          "totalCount": 0,
        }
      `);

      api.mockResolvedValue({
        friendships: [completa()],
        total_count: 1,
      });
      const sinYo = await new ListFriendsUseCase({
        friendRepository,
      }).execute(null);
      expect(sinYo).toMatchInlineSnapshot(`
        {
          "friendships": [
            {
              "addresseeId": "u-2",
              "addresseeName": "Rafa",
              "createdAt": "2026-10-01T08:00:00.000Z",
              "id": "f-1",
              "isAccepted": true,
              "isBlocked": false,
              "isDeclined": false,
              "isPending": false,
              "requesterId": "u-1",
              "requesterName": "Trinx",
              "respondedAt": "2026-10-02T09:30:00.000Z",
              "status": "ACCEPTED",
              "updatedAt": "2026-10-01T08:00:00.000Z",
            },
          ],
          "totalCount": 1,
        }
      `);
    });

    it('con alias del otro: su nombre real pequeño debajo', async () => {
      api.mockResolvedValue({
        friendships: [
          completa({
            addressee_name: 'Rafita',
            addressee_alias: 'Rafita',
            addressee_real_name: 'Rafa Nadal',
            addressee_handicap: 3.2,
          }),
        ],
        total_count: 1,
      });
      const result = await new ListFriendsUseCase({
        friendRepository,
      }).execute('u-1');
      expect(result).toMatchInlineSnapshot(`
        {
          "friendships": [
            {
              "addresseeId": "u-2",
              "addresseeName": "Rafita",
              "createdAt": "2026-10-01T08:00:00.000Z",
              "id": "f-1",
              "isAccepted": true,
              "isBlocked": false,
              "isDeclined": false,
              "isPending": false,
              "isSentByMe": true,
              "otherUserHandicap": 3.2,
              "otherUserId": "u-2",
              "otherUserName": "Rafita",
              "otherUserSubName": "Rafa Nadal",
              "requesterId": "u-1",
              "requesterName": "Trinx",
              "respondedAt": "2026-10-02T09:30:00.000Z",
              "status": "ACCEPTED",
              "updatedAt": "2026-10-01T08:00:00.000Z",
            },
          ],
          "totalCount": 1,
        }
      `);
    });

    it('lista vacía', async () => {
      api.mockResolvedValue({});
      const result = await new ListFriendsUseCase({
        friendRepository,
      }).execute('u-1');
      expect(result).toMatchInlineSnapshot(`
        {
          "friendships": [],
          "totalCount": 0,
        }
      `);
    });
  });

  describe('ListPendingFriendRequestsUseCase', () => {
    it('recibidas: el otro es quien la pidió', async () => {
      api.mockResolvedValue({
        friendships: [
          completa({
            status: 'PENDING',
            responded_at: null,
            requester_handicap: undefined,
            addressee_handicap: undefined,
          }),
        ],
        total_count: 1,
      });
      const result = await new ListPendingFriendRequestsUseCase({
        friendRepository,
      }).execute('u-2', 'received');
      expect(result).toMatchInlineSnapshot(`
        {
          "friendships": [
            {
              "addresseeId": "u-2",
              "addresseeName": "Rafa",
              "createdAt": "2026-10-01T08:00:00.000Z",
              "id": "f-1",
              "isAccepted": false,
              "isBlocked": false,
              "isDeclined": false,
              "isPending": true,
              "isSentByMe": false,
              "otherUserHandicap": null,
              "otherUserId": "u-1",
              "otherUserName": "Trinx",
              "otherUserSubName": "Agustín Estévez",
              "requesterId": "u-1",
              "requesterName": "Trinx",
              "respondedAt": null,
              "status": "PENDING",
              "updatedAt": "2026-10-01T08:00:00.000Z",
            },
          ],
          "totalCount": 1,
        }
      `);
    });

    it('enviada a alguien con alias pero sin nombre real', async () => {
      api.mockResolvedValue({
        friendships: [
          minima({
            addressee_name: 'Rafita',
            addressee_alias: 'Rafita',
            created_at: '2026-10-01T08:00:00Z',
            updated_at: '2026-10-01T08:00:00Z',
          }),
        ],
        total_count: 1,
      });
      const result = await new ListPendingFriendRequestsUseCase({
        friendRepository,
      }).execute('u-1', 'sent');
      expect(result).toMatchInlineSnapshot(`
        {
          "friendships": [
            {
              "addresseeId": "u-2",
              "addresseeName": "Rafita",
              "createdAt": "2026-10-01T08:00:00.000Z",
              "id": "f-2",
              "isAccepted": false,
              "isBlocked": false,
              "isDeclined": false,
              "isPending": true,
              "isSentByMe": true,
              "otherUserHandicap": null,
              "otherUserId": "u-2",
              "otherUserName": "Rafita",
              "otherUserSubName": null,
              "requesterId": "u-1",
              "respondedAt": null,
              "status": "PENDING",
              "updatedAt": "2026-10-01T08:00:00.000Z",
            },
          ],
          "totalCount": 1,
        }
      `);
    });

    it('enviadas, sin campos opcionales', async () => {
      api.mockResolvedValue({
        friendships: [
          minima({
            addressee_name: 'Rafa',
            addressee_alias: 'Rafita',
            created_at: '2026-10-01T08:00:00Z',
            updated_at: '2026-10-01T08:00:00Z',
          }),
          minima({
            id: 'f-5',
            created_at: '2026-10-01T08:00:00Z',
            updated_at: '2026-10-01T08:00:00Z',
          }),
        ],
        total_count: null,
      });
      const result = await new ListPendingFriendRequestsUseCase({
        friendRepository,
      }).execute('u-1', 'sent');
      expect(result).toMatchInlineSnapshot(`
        {
          "friendships": [
            {
              "addresseeId": "u-2",
              "addresseeName": "Rafa",
              "createdAt": "2026-10-01T08:00:00.000Z",
              "id": "f-2",
              "isAccepted": false,
              "isBlocked": false,
              "isDeclined": false,
              "isPending": true,
              "isSentByMe": true,
              "otherUserHandicap": null,
              "otherUserId": "u-2",
              "otherUserName": "Rafa",
              "otherUserSubName": null,
              "requesterId": "u-1",
              "respondedAt": null,
              "status": "PENDING",
              "updatedAt": "2026-10-01T08:00:00.000Z",
            },
            {
              "addresseeId": "u-2",
              "createdAt": "2026-10-01T08:00:00.000Z",
              "id": "f-5",
              "isAccepted": false,
              "isBlocked": false,
              "isDeclined": false,
              "isPending": true,
              "isSentByMe": true,
              "otherUserHandicap": null,
              "otherUserId": "u-2",
              "otherUserName": undefined,
              "otherUserSubName": null,
              "requesterId": "u-1",
              "respondedAt": null,
              "status": "PENDING",
              "updatedAt": "2026-10-01T08:00:00.000Z",
            },
          ],
          "totalCount": 0,
        }
      `);
    });
  });
});
