import { describe, it, expect } from 'vitest';
import {
  entraALosSobres,
  botonesDeLosSobres,
  sePuedenDeshacerLosEquipos,
  esCompeticionCerrada,
  jugadoresDelEquipo,
} from './permisosDeLaAgenda';

describe('entraALosSobres', () => {
  const captains = { teamA: 'ana', teamB: 'bea' };
  it.each([
    ['el capitán del A', 'ana', 'org', true],
    ['el capitán del B', 'bea', 'org', true],
    ['el organizador', 'org', 'org', true],
    ['un jugador cualquiera', 'carlos', 'org', false],
    ['sin usuario, aunque no haya capitán', undefined, undefined, false],
  ])('%s', (_, userId, creatorId, esperado) => {
    expect(entraALosSobres({ userId, captains, creatorId })).toBe(esperado);
  });

  it('sin capitanes, solo el organizador', () => {
    expect(
      entraALosSobres({ userId: 'org', captains: undefined, creatorId: 'org' }),
    ).toBe(true);
    expect(
      entraALosSobres({ userId: 'x', captains: undefined, creatorId: 'org' }),
    ).toBe(false);
  });
});

describe('botonesDeLosSobres', () => {
  /*
   *   entra | gestiona | modo        | equipos | abrir | rehacer
   *   ------|----------|-------------|---------|-------|--------
   *   sí    | sí       | RYDER_CUP   | sí      | sí    | sí
   *   sí    | no       | RYDER_CUP   | sí      | sí    | no
   *   no    | sí       | RYDER_CUP   | sí      | no    | sí
   *   sí    | sí       | otro        | sí      | no    | no
   *   sí    | sí       | RYDER_CUP   | no      | no    | no
   */
  it.each([
    [true, true, 'RYDER_CUP', true, true, true],
    [true, false, 'RYDER_CUP', true, true, false],
    [false, true, 'RYDER_CUP', true, false, true],
    [true, true, 'STROKE_PLAY', true, false, false],
    [true, true, 'RYDER_CUP', false, false, false],
  ])(
    'entra=%s gestiona=%s modo=%s equipos=%s → abrir=%s rehacer=%s',
    (entra, canManage, setupMode, hayEquipos, abrirSobre, rehacerSobres) => {
      expect(
        botonesDeLosSobres({ entra, canManage, setupMode, hayEquipos }),
      ).toEqual({ abrirSobre, rehacerSobres });
    },
  );
});

describe('sePuedenDeshacerLosEquipos', () => {
  const sinPartidos = [{ matches: [] }, {}];
  const conPartidos = [{ matches: [] }, { matches: [{ id: 'm1' }] }];
  it.each([
    ['ACTIVE sin partidos', 'ACTIVE', sinPartidos, true],
    ['CLOSED sin partidos', 'CLOSED', sinPartidos, true],
    ['CLOSED con partidos', 'CLOSED', conPartidos, false],
    ['IN_PROGRESS', 'IN_PROGRESS', sinPartidos, false],
    ['DRAFT', 'DRAFT', sinPartidos, false],
  ])('%s', (_, status, rounds, esperado) => {
    expect(sePuedenDeshacerLosEquipos({ status, rounds })).toBe(esperado);
  });
});

describe('esCompeticionCerrada', () => {
  it.each([
    ['CLOSED', true],
    ['IN_PROGRESS', true],
    ['ACTIVE', false],
    ['COMPLETED', false],
  ])('%s → %s', (status, esperado) => {
    expect(esCompeticionCerrada(status)).toBe(esperado);
  });
});

describe('jugadoresDelEquipo', () => {
  const teamAssignment = {
    teamAPlayerIds: ['ana', 'luis', 'retirado'],
    teamBPlayerIds: ['bea'],
  };
  const enrollments = [
    { userId: 'ana', status: 'APPROVED' },
    { userId: 'luis', status: 'APPROVED' },
    { userId: 'retirado', status: 'WITHDRAWN' },
    { userId: 'bea', status: 'APPROVED' },
  ];
  const playerNameMap = new Map([
    ['ana', 'Ana'],
    ['bea', 'Bea'],
  ]);
  const sinNombre = () => 'Sin nombre';

  it('del A, solo los que siguen inscritos, y sin nombre el de siempre', () => {
    expect(
      jugadoresDelEquipo({
        equipo: 'A',
        teamAssignment,
        enrollments,
        playerNameMap,
        sinNombre,
      }),
    ).toEqual([
      { userId: 'ana', name: 'Ana' },
      { userId: 'luis', name: 'Sin nombre' },
    ]);
  });

  it('del B, los suyos', () => {
    expect(
      jugadoresDelEquipo({
        equipo: 'B',
        teamAssignment,
        enrollments,
        playerNameMap,
        sinNombre,
      }),
    ).toEqual([{ userId: 'bea', name: 'Bea' }]);
  });

  it('sin reparto, nadie', () => {
    expect(
      jugadoresDelEquipo({
        equipo: 'A',
        teamAssignment: null,
        enrollments,
        playerNameMap,
        sinNombre,
      }),
    ).toEqual([]);
  });
});
