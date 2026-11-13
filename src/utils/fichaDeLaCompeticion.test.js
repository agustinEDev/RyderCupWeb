import { describe, it, expect, vi } from 'vitest';
import {
  vueltaDeLaFicha,
  diaCortoDeLaFicha,
  porQueNoSeFormaron,
  yaLosHabia,
  conFijado,
  ordenarAprobados,
  textoDelBorrado,
  equipoDe,
  esCapitan,
  textoDeCategorias,
  avisoYClasificacion,
  derivarLaFicha,
} from './fichaDeLaCompeticion';

/**
 * Las reglas puras de la ficha de una competición, sacadas de la página al
 * partirla (fase 5 del plan de calidad). La página tiene sus propios tests de
 * pantalla; aquí se fija cada regla por separado.
 */

// Un `t` que devuelve la clave y, si las hay, sus variables: así se ve qué texto
// y con qué datos se pidió
const t = (clave, datos) =>
  datos ? `${clave} ${JSON.stringify(datos)}` : clave;

describe('vueltaDeLaFicha', () => {
  it('given the user came from browse, when resolving the back link, then it goes back to browse', () => {
    expect(vueltaDeLaFicha('browse')).toEqual({
      to: '/browse-competitions',
      clave: 'detail.backToBrowse',
    });
  });

  it('given the user came from the invitations, when resolving the back link, then it goes back to them', () => {
    expect(vueltaDeLaFicha('invitations')).toEqual({
      to: '/player/invitations',
      clave: 'detail.backToInvitations',
    });
  });

  it.each([undefined, null, 'my-competitions', 'toString', '__proto__'])(
    'given the origin %s, when resolving the back link, then it falls back to my competitions',
    (origen) => {
      expect(vueltaDeLaFicha(origen)).toEqual({
        to: '/competitions',
        clave: 'detail.backToCompetitions',
      });
    },
  );
});

describe('diaCortoDeLaFicha', () => {
  it('given a valid date, when formatting it, then it gives the short weekday, day and month', () => {
    expect(diaCortoDeLaFicha('2026-03-07', 'en-GB')).toBe(
      new Date('2026-03-07T12:00:00').toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
    );
  });

  it('given an invalid date, when formatting it, then it gives an empty text', () => {
    expect(diaCortoDeLaFicha('no-es-fecha', 'es')).toBe('');
  });
});

describe('porQueNoSeFormaron / yaLosHabia', () => {
  it('given the teams were already formed, when explaining, then it uses the organiser text', () => {
    expect(porQueNoSeFormaron(t, { errorCode: 'TEAMS_FORMED' })).toBe(
      'detail.errors.teamsFormedOrganizer',
    );
  });

  it('given a draft in progress, when explaining, then it asks to wait for the draft', () => {
    expect(porQueNoSeFormaron(t, { errorCode: 'DRAFT_IN_PROGRESS' })).toBe(
      'detail.errors.waitForDraft',
    );
  });

  it('given an unknown error with a message, when explaining, then it shows the server message', () => {
    expect(porQueNoSeFormaron(t, { message: 'boom' })).toBe('boom');
  });

  it('given no error at all, when explaining, then it uses the generic text', () => {
    expect(porQueNoSeFormaron(t, undefined)).toBe(
      'detail.errors.teamAssignmentFailed',
    );
  });

  it('given TEAMS_FORMED, when noting it, then the competition is marked with teams assigned', () => {
    const setCompetition = vi.fn();
    yaLosHabia({ errorCode: 'TEAMS_FORMED' }, setCompetition);
    expect(
      setCompetition.mock.calls[0][0]({ id: 'c', teamsAssigned: false }),
    ).toEqual({ id: 'c', teamsAssigned: true });
  });

  it('given another error, when noting it, then the competition is left alone', () => {
    const setCompetition = vi.fn();
    yaLosHabia({ errorCode: 'OTHER' }, setCompetition);
    expect(setCompetition).not.toHaveBeenCalled();
  });
});

describe('conFijado / ordenarAprobados', () => {
  it('given a Ryder, when checking a fixed handicap, then it never counts', () => {
    expect(conFijado(false, { fixedHandicap: 3 })).toBe(false);
  });

  it('given a stroke play with a fixed handicap of 0, when checking, then it counts', () => {
    expect(conFijado(true, { fixedHandicap: 0 })).toBe(true);
  });

  it('given a closed stroke play, when sorting, then fixed handicaps go first in order and the rest behind', () => {
    const aprobados = [
      { id: 'sin', fixedHandicap: null, userHandicap: 1 },
      { id: 'alto', fixedHandicap: 20 },
      { id: 'bajo', fixedHandicap: 2.5 },
    ];
    expect(ordenarAprobados(aprobados, true).map((e) => e.id)).toEqual([
      'bajo',
      'alto',
      'sin',
    ]);
  });

  it('given a Ryder, when sorting, then it goes by team and then by handicap, with no handicap last', () => {
    const aprobados = [
      { id: 'b-10', team: 'B', userHandicap: 10 },
      { id: 'a-sin', team: 'A', userHandicap: null },
      { id: 'a-5', team: 'A', userHandicap: 5 },
      { id: 'b-1', team: 'B', userHandicap: 1 },
    ];
    expect(ordenarAprobados(aprobados, false).map((e) => e.id)).toEqual([
      'a-5',
      'a-sin',
      'b-1',
      'b-10',
    ]);
  });

  it('given a list, when sorting, then the original list is not mutated', () => {
    const aprobados = [
      { id: 'x', userHandicap: 9 },
      { id: 'y', userHandicap: 1 },
    ];
    ordenarAprobados(aprobados, false);
    expect(aprobados.map((e) => e.id)).toEqual(['x', 'y']);
  });
});

describe('textoDelBorrado', () => {
  it('given the enrollments did not load, when deleting, then it does not claim who loses the place', () => {
    expect(
      textoDelBorrado(t, {
        inscripcionesSinCargar: true,
        estoyInscrito: true,
        otrosInscritos: 0,
      }),
    ).toBe('detail.deleteModal.unknownOthers');
  });

  it.each([
    [true, 0, 'detail.deleteModal.nobodyElse'],
    [true, 3, 'detail.deleteModal.othersLosePlace {"count":3}'],
    [false, 0, 'detail.deleteModal.nobodyEnrolled'],
    [false, 2, 'detail.deleteModal.playersLosePlace {"count":2}'],
  ])(
    'given enrolled=%s and %s others, when deleting, then it says %s',
    (estoyInscrito, otrosInscritos, texto) => {
      expect(
        textoDelBorrado(t, {
          inscripcionesSinCargar: false,
          estoyInscrito,
          otrosInscritos,
        }),
      ).toBe(texto);
    },
  );
});

describe('equipoDe / esCapitan', () => {
  const competicion = { team1Name: 'Europa', team2Name: 'América' };
  const reparto = { teamAPlayerIds: ['a'], teamBPlayerIds: ['b'] };

  it('given the split, when looking up each player, then it names their team or nothing', () => {
    expect(equipoDe(reparto, competicion, 'a')).toBe('Europa');
    expect(equipoDe(reparto, competicion, 'b')).toBe('América');
    expect(equipoDe(reparto, competicion, 'c')).toBeNull();
    expect(equipoDe(undefined, competicion, 'a')).toBeNull();
  });

  it('given captains and vice-captains, when checking, then all four count and an empty id never does', () => {
    const capitanes = {
      teamA: 'a',
      teamB: 'b',
      viceTeamA: 'va',
      viceTeamB: 'vb',
    };
    expect(['a', 'b', 'va', 'vb'].every((u) => esCapitan(capitanes, u))).toBe(
      true,
    );
    expect(esCapitan(capitanes, 'otro')).toBe(false);
    expect(esCapitan({ teamA: undefined }, undefined)).toBe(false);
    expect(esCapitan(undefined, 'a')).toBe(false);
  });
});

describe('textoDeCategorias', () => {
  const unDecimal = (n) => n.toFixed(1);

  it('given fewer categories came out than asked with equal limits, when describing, then it says so with the limits', () => {
    const ajustes = { categoryCount: 3, categoryLimits: [10, 20] };
    expect(
      textoDeCategorias(t, ajustes, {
        menosDeLasPedidas: { pedidas: 3, salen: 2 },
        salieron: 2,
        unDecimal,
      }),
    ).toBe(
      'detail.settings.categoriesCameOutWithLimits {"count":3,"salen":2,"limites":"10.0 · 20.0"}',
    );
  });

  it('given fewer came out with hand-written limits, when describing, then it does not name the limits', () => {
    const ajustes = { categoryCount: null, categoryLimits: [10, 20] };
    expect(
      textoDeCategorias(t, ajustes, {
        menosDeLasPedidas: { pedidas: 3, salen: 2 },
        salieron: 2,
        unDecimal,
      }),
    ).toBe(
      'detail.settings.categoriesCameOut {"count":3,"salen":2,"limites":"10.0 · 20.0"}',
    );
  });

  it('given only one category came out, when describing, then there are no categories', () => {
    const ajustes = { categoryCount: 3, categoryLimits: [10, 20] };
    expect(
      textoDeCategorias(t, ajustes, {
        menosDeLasPedidas: { pedidas: 3, salen: 1 },
        salieron: 1,
        unDecimal,
      }),
    ).toBe('detail.settings.noCategories');
  });

  it('given equal categories already split, when describing, then it names the split limits', () => {
    const ajustes = { categoryCount: 2, categoryLimits: [14] };
    expect(
      textoDeCategorias(t, ajustes, {
        menosDeLasPedidas: null,
        salieron: 2,
        unDecimal,
      }),
    ).toBe('detail.settings.equalCategoriesSplit {"count":2,"limites":"14.0"}');
  });

  it('given equal categories not split yet, when describing, then it only says how many', () => {
    const ajustes = { categoryCount: 2, categoryLimits: [] };
    expect(
      textoDeCategorias(t, ajustes, {
        menosDeLasPedidas: null,
        salieron: 0,
        unDecimal,
      }),
    ).toBe('detail.settings.equalCategories {"count":2,"limites":""}');
  });

  it('given hand-written limits, when describing, then it lists them; with none, no categories', () => {
    expect(
      textoDeCategorias(
        t,
        { categoryCount: null, categoryLimits: [9.5] },
        { menosDeLasPedidas: null, salieron: 0, unDecimal },
      ),
    ).toBe('detail.settings.categoryLimits {"limites":"9.5"}');
    expect(
      textoDeCategorias(
        t,
        { categoryCount: null, categoryLimits: [] },
        { menosDeLasPedidas: null, salieron: 0, unDecimal },
      ),
    ).toBe('detail.settings.noCategories');
  });
});

describe('avisoYClasificacion', () => {
  it('given no competition yet, when deriving, then there is neither notice nor leaderboard', () => {
    expect(avisoYClasificacion(t, null, [])).toEqual({
      textoDelAvisoDeCategorias: null,
      conClasificacion: false,
    });
  });

  it.each([
    ['IN_PROGRESS', false, true],
    ['COMPLETED', false, true],
    ['CLOSED', false, false],
    ['IN_PROGRESS', true, false],
  ])(
    'given status %s and hasTeams=%s, when deriving, then conClasificacion is %s',
    (status, hasTeams, esperado) => {
      expect(
        avisoYClasificacion(t, { status, hasTeams }, []).conClasificacion,
      ).toBe(esperado);
    },
  );
});

describe('derivarLaFicha', () => {
  const usuario = {
    id: 'u-1',
    alias: 'Tigre',
    first_name: 'Ana',
    last_name: 'Gil',
  };
  const base = (competicion = {}, extra = {}) =>
    derivarLaFicha({
      t,
      idioma: 'es',
      competition: {
        id: 'c-1',
        status: 'ACTIVE',
        hasTeams: true,
        creatorId: 'otro',
        ...competicion,
      },
      user: usuario,
      enrollments: [],
      approvedEnrollments: [],
      hasCreatorRole: false,
      isAdmin: false,
      inscripcionesSinCargar: false,
      agendaLeida: null,
      franjasDeLaAgenda: [],
      ...extra,
    });

  it('given the creator, when deriving, then they manage it and see the whole list', () => {
    const ficha = base({ creatorId: 'u-1', enrolledVisibility: 'FRIENDS' });
    expect(ficha.isCreator).toBe(true);
    expect(ficha.canManage).toBe(true);
    expect(ficha.listaAMedias).toBe(false);
  });

  it('given a player who only sees friends, when counting, then the server total wins over the visible rows', () => {
    const aprobados = [{ id: 'e1', userId: 'u-2', status: 'APPROVED' }];
    const ficha = base(
      { enrolledVisibility: 'FRIENDS', enrolledCount: 7, maxPlayers: 7 },
      { enrollments: aprobados, approvedEnrollments: aprobados },
    );
    expect(ficha.listaAMedias).toBe(true);
    expect(ficha.noVeANadie).toBe(false);
    expect(ficha.approvedCount).toBe(7);
    expect(ficha.isFull).toBe(true);
    expect(ficha.bloqueaElMaximo).toBe(true);
  });

  it('given a full stroke play whose agenda is not read yet, when deciding, then the max does not hide the button', () => {
    const ficha = base({ hasTeams: false, enrolledCount: 4, maxPlayers: 4 });
    expect(ficha.isFull).toBe(true);
    expect(ficha.bloqueaElMaximo).toBe(false);
  });

  it('given a stroke play where I only wait, when deriving, then it gives my place in the waiting list', () => {
    const mia = {
      id: 'e-1',
      userId: 'u-1',
      status: 'APPROVED',
      useRealName: true,
    };
    const agendaLeida = {
      rounds: [
        {
          id: 'r1',
          roundDate: '2026-03-07',
          teeSheet: { waitingIds: ['x', 'u-1'], playerIds: ['y'] },
        },
      ],
    };
    const ficha = base(
      { hasTeams: false },
      { enrollments: [mia], approvedEnrollments: [mia], agendaLeida },
    );
    expect(ficha.miEspera).toBe(agendaLeida.rounds[0]);
    expect(ficha.puestoEnEspera).toBe(2);
    expect(ficha.soloEspero).toBe(true);
    expect(ficha.estoyInscrito).toBe(true);
    expect(ficha.otrosInscritos).toBe(0);
  });

  it('given my own listed enrollment and an alias, when deriving, then I can choose the name and the switch starts off', () => {
    const mia = {
      id: 'e-1',
      userId: 'u-1',
      status: 'REQUESTED',
      useRealName: true,
    };
    const ficha = base({}, { enrollments: [mia] });
    expect(ficha.puedeElegirNombre).toBe(true);
    expect(ficha.usaSuAlias).toBe(false);
    expect(ficha.nombreLegal).toBe('Ana Gil');
    expect(ficha.hasEnrollment).toBe(mia);
  });

  it('given a scheduled draft, when deriving, then it gives the readable opening date', () => {
    const ficha = base({
      status: 'DRAFT',
      startDate: '2026-12-20',
      enrollmentOpensDaysBefore: 10,
    });
    expect(ficha.fechaDeAperturaLegible).toEqual(expect.any(String));
    expect(
      base({
        status: 'ACTIVE',
        startDate: '2026-12-20',
        enrollmentOpensDaysBefore: 10,
      }).fechaDeAperturaLegible,
    ).toBeNull();
  });

  it('given who can edit the custom handicap, when deriving, then stroke play stops at close and Ryder at start', () => {
    const gestor = { creatorId: 'u-1' };
    expect(
      base({ ...gestor, hasTeams: false, status: 'CLOSED' }).canEditHandicap,
    ).toBe(false);
    expect(
      base({ ...gestor, hasTeams: true, status: 'CLOSED' }).canEditHandicap,
    ).toBe(true);
    expect(base({ hasTeams: true, status: 'ACTIVE' }).canEditHandicap).toBe(
      false,
    );
  });

  it('given a Ryder Cup without a split, when deriving, then the assignment shows as pending', () => {
    expect(
      base({ setupMode: 'RYDER_CUP', teamAssignment: 'MANUAL' })
        .repartoAMostrar,
    ).toBe('PENDING');
    expect(
      base({ setupMode: 'RYDER_CUP', actualTeamAssignment: 'DRAFT' })
        .repartoAMostrar,
    ).toBe('DRAFT');
    expect(
      base({ setupMode: 'QUICK', teamAssignment: 'AUTOMATIC' }).repartoAMostrar,
    ).toBe('AUTOMATIC');
  });
});
