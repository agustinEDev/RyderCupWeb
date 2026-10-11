import { describe, it, expect, vi } from 'vitest';
import GetUpcomingTeeGroupsUseCase from './GetUpcomingTeeGroupsUseCase';

/**
 * Las próximas partidas de stroke play del jugador, para el banner del panel
 * (FE #824, PR 7, caso 17). Como los partidos de la Ryder: de sus
 * competiciones cerradas o en juego, y una que falle no tumba al resto.
 */
const competicion = (id, extra = {}) => ({ id, name: `Torneo ${id}`, status: 'CLOSED', hasTeams: false, ...extra });
const partida = (id, number, teeTime, status = 'SCHEDULED') => ({
  id,
  number,
  teeTime,
  status,
  incomplete: false,
  players: [
    { userId: 'yo', name: 'Yo' },
    { userId: 'ana', name: 'Ana' },
    { userId: 'bea', name: 'Bea' },
  ],
});
const mia = (roundId, roundDate, sessionType, group) => ({ roundId, roundDate, sessionType, group });

const casos = (porCompeticion) => ({
  listUserCompetitionsUseCase: { execute: vi.fn() },
  getMyTeeGroupsUseCase: { execute: vi.fn((id) => (porCompeticion[id] instanceof Error ? Promise.reject(porCompeticion[id]) : Promise.resolve(porCompeticion[id] ?? []))) },
});

describe('GetUpcomingTeeGroupsUseCase (FE #824, PR 7)', () => {
  it('17: de las de stroke play cerradas o en juego, por día, franja y hora; con compañeros', async () => {
    const c = casos({
      a: [mia('r2', '2030-10-13', 'MORNING', partida('g3', 1, '08:00')), mia('r1', '2030-10-12', 'AFTERNOON', partida('g2', 2, '12:10'))],
      b: [mia('r9', '2030-10-12', 'MORNING', partida('g9', 4, '08:30', 'IN_PROGRESS'))],
    });
    const uc = new GetUpcomingTeeGroupsUseCase(c);

    const { matches, complete } = await uc.executeWithCompleteness('yo', [
      competicion('a'),
      competicion('b', { status: 'IN_PROGRESS' }),
      competicion('ryder', { hasTeams: true }),
      competicion('abierta', { status: 'ACTIVE' }),
    ]);

    expect(c.getMyTeeGroupsUseCase.execute.mock.calls.map(([id]) => id)).toEqual(['a', 'b']);
    expect(complete).toBe(true);
    expect(matches.map((m) => m.id)).toEqual(['g9', 'g2', 'g3']);
    expect(matches[1]).toEqual({
      id: 'g2',
      esPartidaDeFranja: true,
      status: 'SCHEDULED',
      competitionId: 'a',
      competitionName: 'Torneo a',
      roundId: 'r1',
      roundDate: '2030-10-12',
      sessionType: 'AFTERNOON',
      teeTime: '12:10',
      matchNumber: 2,
      partnerNames: ['Ana', 'Bea'],
    });
  });

  it('las de días pasados no salen aunque nadie cerrara la franja (revisor)', async () => {
    const c = casos({ a: [mia('r0', '2030-10-11', 'MORNING', partida('g0', 1, '08:00')), mia('r1', '2030-10-12', 'MORNING', partida('g1', 1, '08:00'))] });

    const { matches } = await new GetUpcomingTeeGroupsUseCase(c).executeWithCompleteness('yo', [competicion('a')], new Date(2030, 9, 12, 20, 0));

    expect(matches.map((m) => m.id)).toEqual(['g1']);
  });

  it('sin hora (no debería pasar), ordenar no revienta (CodeRabbit)', async () => {
    const sinHora = (id) => ({ ...partida(id, 1, undefined) });
    const c = casos({ a: [mia('r1', '2030-10-12', 'MORNING', sinHora('g1')), mia('r2', '2030-10-12', 'MORNING', sinHora('g2'))] });

    const { matches } = await new GetUpcomingTeeGroupsUseCase(c).executeWithCompleteness('yo', [competicion('a')]);

    expect(matches.map((m) => m.id).sort()).toEqual(['g1', 'g2']);
  });

  it('las acabadas no salen', async () => {
    const c = casos({ a: [mia('r1', '2030-10-12', 'MORNING', partida('g1', 1, '08:00', 'COMPLETED'))] });

    const { matches } = await new GetUpcomingTeeGroupsUseCase(c).executeWithCompleteness('yo', [competicion('a')]);

    expect(matches).toEqual([]);
  });

  it('una competición que falla no tumba al resto, pero la lista no está entera', async () => {
    const c = casos({ a: new Error('x'), b: [mia('r1', '2030-10-12', 'MORNING', partida('g1', 1, '08:00'))] });

    const r = await new GetUpcomingTeeGroupsUseCase(c).executeWithCompleteness('yo', [competicion('a'), competicion('b')]);

    expect(r.matches.map((m) => m.id)).toEqual(['g1']);
    expect(r.complete).toBe(false);
  });

  it('sin competiciones cargadas, las pide', async () => {
    const c = casos({});
    c.listUserCompetitionsUseCase.execute.mockResolvedValue([]);

    expect(await new GetUpcomingTeeGroupsUseCase(c).executeWithCompleteness('yo')).toEqual({ matches: [], complete: true });
    expect(c.listUserCompetitionsUseCase.execute).toHaveBeenCalledWith('yo');
  });

  it('sin usuario, falla', async () => {
    await expect(new GetUpcomingTeeGroupsUseCase(casos({})).executeWithCompleteness('')).rejects.toThrow();
  });
});
