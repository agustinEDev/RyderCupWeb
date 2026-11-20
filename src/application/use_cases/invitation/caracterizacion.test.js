import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ApiInvitationRepository from '../../../infrastructure/repositories/ApiInvitationRepository';
import SendInvitationUseCase from './SendInvitationUseCase';
import SendInvitationByEmailUseCase from './SendInvitationByEmailUseCase';
import ListMyInvitationsUseCase from './ListMyInvitationsUseCase';
import RespondToInvitationUseCase from './RespondToInvitationUseCase';
import ListCompetitionInvitationsUseCase from './ListCompetitionInvitationsUseCase';

vi.mock('../../../infrastructure/http/api.js', async () => ({
  segmento: (await vi.importActual('../../../infrastructure/http/rutaDeLaApi'))
    .segmento,
  default: vi.fn(),
}));

import apiRequest from '../../../infrastructure/http/api.js';

/**
 * Caracterización: el DTO que sale hoy de cada caso de uso de invitaciones,
 * con el repositorio REAL y la respuesta con la forma real de la API.
 * Fija los nombres que vienen del join (competición, quien invita, invitado)
 * y lo que pasa cuando faltan. No se regenera al sacar esos nombres de la
 * entidad del dominio.
 *
 *   caso                              | respuesta
 *   ----------------------------------|----------------------------------------
 *   C1 enviar por usuario             | completa (con los tres nombres)
 *   C2 enviar por correo              | sin nombres ni usuario, opcionales ausentes
 *   C3 mis invitaciones               | lista: completa, nombres null, nombres ''
 *   C4 responder                      | aceptada, solo nombre de competición
 *   C5 invitaciones de la competición | lista con nombres de quien invita e invitado
 *   C6 listas sin `invitations`       | vacío y total por defecto
 */

const completa = {
  id: 'inv-1',
  competition_id: 'comp-1',
  competition_name: 'Summer Cup',
  inviter_id: 'user-1',
  inviter_name: 'Creator',
  invitee_email: 'player@example.com',
  invitee_user_id: 'user-2',
  invitee_name: 'Player',
  status: 'PENDING',
  personal_message: 'Join us!',
  expires_at: '2026-12-25T10:00:00Z',
  responded_at: null,
  created_at: '2026-11-18T10:00:00Z',
  updated_at: '2026-11-18T10:00:00Z',
};

const minima = {
  id: 'inv-2',
  competition_id: 'comp-1',
  inviter_id: 'user-1',
  invitee_email: 'nuevo@example.com',
  status: 'PENDING',
  created_at: '2026-11-18T10:00:00Z',
  updated_at: '2026-11-18T10:00:00Z',
};

const nombresNull = {
  ...completa,
  id: 'inv-3',
  competition_name: null,
  inviter_name: null,
  invitee_name: null,
};

const nombresVacios = {
  ...completa,
  id: 'inv-4',
  competition_name: '',
  inviter_name: '',
  invitee_name: '',
  status: 'ON_HOLD',
};

const repoReal = () => ({
  invitationRepository: new ApiInvitationRepository(),
});

describe('Invitaciones · caracterización de los DTO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('C1: enviar por usuario con la respuesta completa', async () => {
    apiRequest.mockResolvedValue(completa);

    const dto = await new SendInvitationUseCase(repoReal()).execute(
      'comp-1',
      'user-2',
      'Join us!',
    );

    expect(dto).toMatchInlineSnapshot(`
      {
        "competitionId": "comp-1",
        "competitionName": "Summer Cup",
        "createdAt": "2026-11-18T10:00:00.000Z",
        "expiresAt": "2026-12-25T10:00:00.000Z",
        "hasInviteeUser": true,
        "id": "inv-1",
        "inviteeEmail": "player@example.com",
        "inviteeName": "Player",
        "inviteeUserId": "user-2",
        "inviterId": "user-1",
        "inviterName": "Creator",
        "isAccepted": false,
        "isDeclined": false,
        "isExpired": false,
        "isOnHold": false,
        "isPending": true,
        "isTerminal": false,
        "personalMessage": "Join us!",
        "respondedAt": null,
        "status": "PENDING",
        "updatedAt": "2026-11-18T10:00:00.000Z",
      }
    `);
  });

  it('C2: enviar por correo sin nombres ni opcionales', async () => {
    apiRequest.mockResolvedValue(minima);

    const dto = await new SendInvitationByEmailUseCase(repoReal()).execute(
      'comp-1',
      'nuevo@example.com',
    );

    expect(dto).toMatchInlineSnapshot(`
      {
        "competitionId": "comp-1",
        "createdAt": "2026-11-18T10:00:00.000Z",
        "expiresAt": null,
        "hasInviteeUser": false,
        "id": "inv-2",
        "inviteeEmail": "nuevo@example.com",
        "inviteeUserId": null,
        "inviterId": "user-1",
        "isAccepted": false,
        "isDeclined": false,
        "isExpired": false,
        "isOnHold": false,
        "isPending": true,
        "isTerminal": false,
        "personalMessage": null,
        "respondedAt": null,
        "status": "PENDING",
        "updatedAt": "2026-11-18T10:00:00.000Z",
      }
    `);
  });

  it('C3: mis invitaciones con nombres completos, null y vacíos', async () => {
    apiRequest.mockResolvedValue({
      invitations: [completa, nombresNull, nombresVacios, minima],
      total_count: 4,
    });

    const resultado = await new ListMyInvitationsUseCase(repoReal()).execute({
      status: 'PENDING',
    });

    expect(resultado).toMatchInlineSnapshot(`
      {
        "invitations": [
          {
            "competitionId": "comp-1",
            "competitionName": "Summer Cup",
            "createdAt": "2026-11-18T10:00:00.000Z",
            "expiresAt": "2026-12-25T10:00:00.000Z",
            "hasInviteeUser": true,
            "id": "inv-1",
            "inviteeEmail": "player@example.com",
            "inviteeName": "Player",
            "inviteeUserId": "user-2",
            "inviterId": "user-1",
            "inviterName": "Creator",
            "isAccepted": false,
            "isDeclined": false,
            "isExpired": false,
            "isOnHold": false,
            "isPending": true,
            "isTerminal": false,
            "personalMessage": "Join us!",
            "respondedAt": null,
            "status": "PENDING",
            "updatedAt": "2026-11-18T10:00:00.000Z",
          },
          {
            "competitionId": "comp-1",
            "createdAt": "2026-11-18T10:00:00.000Z",
            "expiresAt": "2026-12-25T10:00:00.000Z",
            "hasInviteeUser": true,
            "id": "inv-3",
            "inviteeEmail": "player@example.com",
            "inviteeUserId": "user-2",
            "inviterId": "user-1",
            "isAccepted": false,
            "isDeclined": false,
            "isExpired": false,
            "isOnHold": false,
            "isPending": true,
            "isTerminal": false,
            "personalMessage": "Join us!",
            "respondedAt": null,
            "status": "PENDING",
            "updatedAt": "2026-11-18T10:00:00.000Z",
          },
          {
            "competitionId": "comp-1",
            "createdAt": "2026-11-18T10:00:00.000Z",
            "expiresAt": "2026-12-25T10:00:00.000Z",
            "hasInviteeUser": true,
            "id": "inv-4",
            "inviteeEmail": "player@example.com",
            "inviteeUserId": "user-2",
            "inviterId": "user-1",
            "isAccepted": false,
            "isDeclined": false,
            "isExpired": false,
            "isOnHold": true,
            "isPending": false,
            "isTerminal": false,
            "personalMessage": "Join us!",
            "respondedAt": null,
            "status": "ON_HOLD",
            "updatedAt": "2026-11-18T10:00:00.000Z",
          },
          {
            "competitionId": "comp-1",
            "createdAt": "2026-11-18T10:00:00.000Z",
            "expiresAt": null,
            "hasInviteeUser": false,
            "id": "inv-2",
            "inviteeEmail": "nuevo@example.com",
            "inviteeUserId": null,
            "inviterId": "user-1",
            "isAccepted": false,
            "isDeclined": false,
            "isExpired": false,
            "isOnHold": false,
            "isPending": true,
            "isTerminal": false,
            "personalMessage": null,
            "respondedAt": null,
            "status": "PENDING",
            "updatedAt": "2026-11-18T10:00:00.000Z",
          },
        ],
        "totalCount": 4,
      }
    `);
  });

  it('C4: responder (aceptada, solo con nombre de competición)', async () => {
    apiRequest.mockResolvedValue({
      ...minima,
      competition_name: 'Winter Cup',
      status: 'ACCEPTED',
      responded_at: '2026-11-19T10:00:00Z',
    });

    const dto = await new RespondToInvitationUseCase(repoReal()).execute(
      'inv-2',
      'ACCEPT',
    );

    expect(dto).toMatchInlineSnapshot(`
      {
        "competitionId": "comp-1",
        "competitionName": "Winter Cup",
        "createdAt": "2026-11-18T10:00:00.000Z",
        "expiresAt": null,
        "hasInviteeUser": false,
        "id": "inv-2",
        "inviteeEmail": "nuevo@example.com",
        "inviteeUserId": null,
        "inviterId": "user-1",
        "isAccepted": true,
        "isDeclined": false,
        "isExpired": false,
        "isOnHold": false,
        "isPending": false,
        "isTerminal": true,
        "personalMessage": null,
        "respondedAt": "2026-11-19T10:00:00.000Z",
        "status": "ACCEPTED",
        "updatedAt": "2026-11-18T10:00:00.000Z",
      }
    `);
  });

  it('C5: invitaciones de la competición con quien invita e invitado', async () => {
    apiRequest.mockResolvedValue({
      invitations: [
        { ...minima, inviter_name: 'Org', invitee_name: 'Nuevo' },
        completa,
      ],
      total_count: 2,
    });

    const resultado = await new ListCompetitionInvitationsUseCase(
      repoReal(),
    ).execute('comp-1');

    expect(resultado).toMatchInlineSnapshot(`
      {
        "invitations": [
          {
            "competitionId": "comp-1",
            "createdAt": "2026-11-18T10:00:00.000Z",
            "expiresAt": null,
            "hasInviteeUser": false,
            "id": "inv-2",
            "inviteeEmail": "nuevo@example.com",
            "inviteeName": "Nuevo",
            "inviteeUserId": null,
            "inviterId": "user-1",
            "inviterName": "Org",
            "isAccepted": false,
            "isDeclined": false,
            "isExpired": false,
            "isOnHold": false,
            "isPending": true,
            "isTerminal": false,
            "personalMessage": null,
            "respondedAt": null,
            "status": "PENDING",
            "updatedAt": "2026-11-18T10:00:00.000Z",
          },
          {
            "competitionId": "comp-1",
            "competitionName": "Summer Cup",
            "createdAt": "2026-11-18T10:00:00.000Z",
            "expiresAt": "2026-12-25T10:00:00.000Z",
            "hasInviteeUser": true,
            "id": "inv-1",
            "inviteeEmail": "player@example.com",
            "inviteeName": "Player",
            "inviteeUserId": "user-2",
            "inviterId": "user-1",
            "inviterName": "Creator",
            "isAccepted": false,
            "isDeclined": false,
            "isExpired": false,
            "isOnHold": false,
            "isPending": true,
            "isTerminal": false,
            "personalMessage": "Join us!",
            "respondedAt": null,
            "status": "PENDING",
            "updatedAt": "2026-11-18T10:00:00.000Z",
          },
        ],
        "totalCount": 2,
      }
    `);
  });

  it('C6: listas sin `invitations` ni `total_count`', async () => {
    apiRequest.mockResolvedValue({});

    const mias = await new ListMyInvitationsUseCase(repoReal()).execute();
    const deLaCompeticion = await new ListCompetitionInvitationsUseCase(
      repoReal(),
    ).execute('comp-1');

    expect({ mias, deLaCompeticion }).toMatchInlineSnapshot(`
      {
        "deLaCompeticion": {
          "invitations": [],
          "totalCount": 0,
        },
        "mias": {
          "invitations": [],
          "totalCount": 0,
        },
      }
    `);
  });
});
