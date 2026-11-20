import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiEnrollmentRepository from '../../../infrastructure/repositories/ApiEnrollmentRepository';
import ListEnrollmentsUseCase from './ListEnrollmentsUseCase';
import RequestEnrollmentUseCase from './RequestEnrollmentUseCase';

vi.mock('../../../infrastructure/http/api.js', async () => ({
  segmento: (await vi.importActual('../../../infrastructure/http/rutaDeLaApi'))
    .segmento,
  default: vi.fn(),
}));

import apiRequest from '../../../infrastructure/http/api.js';

/**
 * EXCEPCIÓN DELIBERADA a «mockear repositorios en los tests de casos de uso»
 * (CLAUDE.md): aquí el repositorio es el real a propósito, con `apiRequest`
 * simulado. Con un repositorio simulado no se vería lo que cambia entre la
 * respuesta de la API y el DTO, que es justo lo que este test vigila.
 *
 * Caracterización: el DTO que sale hoy del repositorio real + caso de uso, con la
 * respuesta de la API tal como llega. Fija el comportamiento antes de dejar de colgar la
 * respuesta cruda de la entidad; estos snapshots no se regeneran tras el cambio.
 */
const base = (extra = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  competition_id: '22222222-2222-4222-8222-222222222222',
  user_id: '33333333-3333-4333-8333-333333333333',
  status: 'APPROVED',
  team_id: 'A',
  custom_handicap: '10.5',
  color: 'WHITE',
  use_real_name: false,
  created_at: '2030-10-01T10:00:00Z',
  updated_at: '2030-10-02T10:00:00Z',
  ...extra,
});

const usuarioCompleto = {
  id: '33333333-3333-4333-8333-333333333333',
  first_name: 'Agustín',
  last_name: 'Estévez',
  alias: 'Trinx',
  display_name: 'Trinx',
  email: 'a@example.com',
  handicap: 14.2,
  country_code: 'ES',
  gender: 'MALE',
};

const listar = async (respuesta) => {
  apiRequest.mockResolvedValue(respuesta);
  const useCase = new ListEnrollmentsUseCase(new ApiEnrollmentRepository());
  return useCase.execute('22222222-2222-4222-8222-222222222222', {
    status: 'APPROVED',
  });
};

describe('Caracterización · ListEnrollmentsUseCase con el repositorio real', () => {
  beforeEach(() => vi.clearAllMocks());

  it('respuesta completa: user anidado, fijado y categoría', async () => {
    const dtos = await listar([
      base({ user: usuarioCompleto, fixed_handicap: '12.3', category: 2 }),
    ]);

    expect(apiRequest.mock.calls[0][0]).toMatchInlineSnapshot(
      `"/api/v1/competitions/22222222-2222-4222-8222-222222222222/enrollments?status=APPROVED"`,
    );
    expect(dtos).toMatchInlineSnapshot(`
      [
        {
          "category": 2,
          "color": "WHITE",
          "competitionId": "22222222-2222-4222-8222-222222222222",
          "createdAt": "2030-10-01T10:00:00.000Z",
          "customHandicap": 10.5,
          "fixedHandicap": 12.3,
          "hasCustomHandicap": true,
          "hasTeamAssigned": true,
          "id": "11111111-1111-4111-8111-111111111111",
          "isApproved": true,
          "isCancelled": false,
          "isPending": false,
          "isRejected": false,
          "isWithdrawn": false,
          "status": "APPROVED",
          "teamId": "A",
          "updatedAt": "2030-10-02T10:00:00.000Z",
          "useRealName": false,
          "userCountryCode": "ES",
          "userEmail": "a@example.com",
          "userGender": "MALE",
          "userHandicap": 14.2,
          "userId": "33333333-3333-4333-8333-333333333333",
          "userName": "Trinx",
          "userSubName": "Agustín Estévez",
        },
      ]
    `);
  });

  it('pública: nombre real delante y alias debajo', async () => {
    const dtos = await listar([
      base({
        user: { ...usuarioCompleto, display_name: 'Agustín Estévez' },
      }),
    ]);

    expect({
      userName: dtos[0].userName,
      userSubName: dtos[0].userSubName,
    }).toMatchInlineSnapshot(`
      {
        "userName": "Agustín Estévez",
        "userSubName": "Trinx",
      }
    `);
  });

  it('user sin display_name: cae a nombre y apellidos; sin alias, sin subnombre', async () => {
    const dtos = await listar([
      base({
        user: {
          first_name: 'Ana',
          last_name: 'López',
          email: '',
          handicap: null,
          gender: '',
        },
      }),
    ]);

    expect(dtos[0]).toMatchInlineSnapshot(`
      {
        "category": null,
        "color": "WHITE",
        "competitionId": "22222222-2222-4222-8222-222222222222",
        "createdAt": "2030-10-01T10:00:00.000Z",
        "customHandicap": 10.5,
        "fixedHandicap": null,
        "hasCustomHandicap": true,
        "hasTeamAssigned": true,
        "id": "11111111-1111-4111-8111-111111111111",
        "isApproved": true,
        "isCancelled": false,
        "isPending": false,
        "isRejected": false,
        "isWithdrawn": false,
        "status": "APPROVED",
        "teamId": "A",
        "updatedAt": "2030-10-02T10:00:00.000Z",
        "useRealName": false,
        "userCountryCode": undefined,
        "userEmail": null,
        "userGender": null,
        "userHandicap": null,
        "userId": "33333333-3333-4333-8333-333333333333",
        "userName": "Ana López",
        "userSubName": null,
      }
    `);
  });

  it('user solo con full_name o name (último recurso)', async () => {
    const dtos = await listar([
      base({ user: { full_name: 'Nombre Completo' } }),
      base({ user: { name: 'Invitado' } }),
      base({ user: { first_name: null, last_name: null } }),
    ]);

    expect(
      dtos.map(({ userName, userSubName, userEmail }) => ({
        userName,
        userSubName,
        userEmail,
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "userEmail": null,
          "userName": "Nombre Completo",
          "userSubName": null,
        },
        {
          "userEmail": null,
          "userName": "Invitado",
          "userSubName": null,
        },
        {
          "userEmail": null,
          "userName": null,
          "userSubName": null,
        },
      ]
    `);
  });

  it('user vacío ({}): sigue siendo la rama anidada', async () => {
    const dtos = await listar([base({ user: {}, user_name: 'Plano' })]);

    expect(dtos[0]).toMatchInlineSnapshot(`
      {
        "category": null,
        "color": "WHITE",
        "competitionId": "22222222-2222-4222-8222-222222222222",
        "createdAt": "2030-10-01T10:00:00.000Z",
        "customHandicap": 10.5,
        "fixedHandicap": null,
        "hasCustomHandicap": true,
        "hasTeamAssigned": true,
        "id": "11111111-1111-4111-8111-111111111111",
        "isApproved": true,
        "isCancelled": false,
        "isPending": false,
        "isRejected": false,
        "isWithdrawn": false,
        "status": "APPROVED",
        "teamId": "A",
        "updatedAt": "2030-10-02T10:00:00.000Z",
        "useRealName": false,
        "userCountryCode": undefined,
        "userEmail": null,
        "userGender": null,
        "userHandicap": undefined,
        "userId": "33333333-3333-4333-8333-333333333333",
        "userName": null,
        "userSubName": null,
      }
    `);
  });

  it('respuesta antigua con campos planos (sin user)', async () => {
    const dtos = await listar([
      base({
        user_name: 'Meis',
        user_email: 'meis@example.com',
        user_handicap: 7.1,
      }),
    ]);

    expect(dtos[0]).toMatchInlineSnapshot(`
      {
        "category": null,
        "color": "WHITE",
        "competitionId": "22222222-2222-4222-8222-222222222222",
        "createdAt": "2030-10-01T10:00:00.000Z",
        "customHandicap": 10.5,
        "fixedHandicap": null,
        "hasCustomHandicap": true,
        "hasTeamAssigned": true,
        "id": "11111111-1111-4111-8111-111111111111",
        "isApproved": true,
        "isCancelled": false,
        "isPending": false,
        "isRejected": false,
        "isWithdrawn": false,
        "status": "APPROVED",
        "teamId": "A",
        "updatedAt": "2030-10-02T10:00:00.000Z",
        "useRealName": false,
        "userEmail": "meis@example.com",
        "userHandicap": 7.1,
        "userId": "33333333-3333-4333-8333-333333333333",
        "userName": "Meis",
        "userSubName": null,
      }
    `);
  });

  it('planos vacíos o nulos: user_handicap null sí entra, el resto no', async () => {
    const dtos = await listar([
      base({
        user: null,
        user_name: '',
        user_email: null,
        user_handicap: null,
      }),
      base({}),
    ]);

    expect(
      dtos.map((d) => {
        const { userName, userSubName, userEmail, userHandicap } = d;
        return {
          userName,
          userSubName,
          userEmail,
          userHandicap,
          tieneUserHandicap: 'userHandicap' in d,
          tieneUserName: 'userName' in d,
          tieneUserEmail: 'userEmail' in d,
        };
      }),
    ).toMatchInlineSnapshot(`
      [
        {
          "tieneUserEmail": false,
          "tieneUserHandicap": true,
          "tieneUserName": false,
          "userEmail": undefined,
          "userHandicap": null,
          "userName": undefined,
          "userSubName": null,
        },
        {
          "tieneUserEmail": false,
          "tieneUserHandicap": false,
          "tieneUserName": false,
          "userEmail": undefined,
          "userHandicap": undefined,
          "userName": undefined,
          "userSubName": null,
        },
      ]
    `);
  });

  it('mínima: sin opcionales (fijado 0, categoría 0, sin equipo ni barra)', async () => {
    const dtos = await listar([
      base({
        status: 'REQUESTED',
        team_id: null,
        custom_handicap: null,
        color: null,
        use_real_name: undefined,
        fixed_handicap: 0,
        category: 0,
      }),
    ]);

    expect(dtos[0]).toMatchInlineSnapshot(`
      {
        "category": 0,
        "color": null,
        "competitionId": "22222222-2222-4222-8222-222222222222",
        "createdAt": "2030-10-01T10:00:00.000Z",
        "customHandicap": null,
        "fixedHandicap": 0,
        "hasCustomHandicap": false,
        "hasTeamAssigned": false,
        "id": "11111111-1111-4111-8111-111111111111",
        "isApproved": false,
        "isCancelled": false,
        "isPending": true,
        "isRejected": false,
        "isWithdrawn": false,
        "status": "REQUESTED",
        "teamId": null,
        "updatedAt": "2030-10-02T10:00:00.000Z",
        "useRealName": false,
        "userId": "33333333-3333-4333-8333-333333333333",
        "userSubName": null,
      }
    `);
  });

  it('la API no devuelve una lista: lista vacía', async () => {
    expect(await listar(null)).toMatchInlineSnapshot(`[]`);
    expect(await listar({ detail: 'x' })).toMatchInlineSnapshot(`[]`);
  });
});

describe('Caracterización · RequestEnrollmentUseCase con el repositorio real', () => {
  beforeEach(() => vi.clearAllMocks());

  it('si ya está inscrito (findByCompetitionAndUser encuentra), no se apunta', async () => {
    apiRequest.mockResolvedValueOnce([base({ user: usuarioCompleto })]);
    const useCase = new RequestEnrollmentUseCase(new ApiEnrollmentRepository());

    await expect(
      useCase.execute(
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Ya estás inscrito en esta competición]`,
    );
    expect(apiRequest.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
      [
        "/api/v1/competitions/22222222-2222-4222-8222-222222222222/enrollments?user_id=33333333-3333-4333-8333-333333333333",
      ]
    `);
  });

  it('si no lo está, se apunta y devuelve el DTO sin campos de la API', async () => {
    apiRequest
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(
        base({ user: usuarioCompleto, round_id: 'r1', waiting: true }),
      );
    const useCase = new RequestEnrollmentUseCase(new ApiEnrollmentRepository());

    const dto = await useCase.execute(
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      { color: 'WHITE' },
    );

    expect(dto).toMatchInlineSnapshot(`
      {
        "category": null,
        "color": "WHITE",
        "competitionId": "22222222-2222-4222-8222-222222222222",
        "createdAt": "2030-10-01T10:00:00.000Z",
        "customHandicap": 10.5,
        "fixedHandicap": null,
        "hasCustomHandicap": true,
        "hasTeamAssigned": true,
        "id": "11111111-1111-4111-8111-111111111111",
        "isApproved": true,
        "isCancelled": false,
        "isPending": false,
        "isRejected": false,
        "isWithdrawn": false,
        "roundId": "r1",
        "status": "APPROVED",
        "teamId": "A",
        "updatedAt": "2030-10-02T10:00:00.000Z",
        "useRealName": false,
        "userId": "33333333-3333-4333-8333-333333333333",
        "waiting": true,
      }
    `);
  });
});
