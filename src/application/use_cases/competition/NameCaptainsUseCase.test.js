import { describe, it, expect, vi, beforeEach } from 'vitest';
import NameCaptainsUseCase from './NameCaptainsUseCase';

/**
 * Nombrar a los capitanes (FE #692). En el servidor, nombrarlos cierra las
 * inscripciones (RyderCupAM#320); con un número impar responde el aviso, que
 * no bloquea.
 */
describe('NameCaptainsUseCase', () => {
  let repositorio;
  let useCase;

  beforeEach(() => {
    repositorio = { nameCaptains: vi.fn() };
    useCase = new NameCaptainsUseCase({ competitionRepository: repositorio });
  });

  it('N1: manda los dos capitanes y traduce la respuesta', async () => {
    repositorio.nameCaptains.mockResolvedValue({
      id: 'comp-1',
      status: 'CLOSED',
      team_a_captain_id: 'ana',
      team_b_captain_id: 'bea',
      total_players: 7,
      uneven_teams: true,
    });

    const resultado = await useCase.execute('comp-1', { teamA: 'ana', teamB: 'bea' });

    expect(repositorio.nameCaptains).toHaveBeenCalledWith('comp-1', {
      team_a_captain_id: 'ana',
      team_b_captain_id: 'bea',
    });
    expect(resultado).toEqual({
      id: 'comp-1',
      status: 'CLOSED',
      captains: { teamA: 'ana', teamB: 'bea' },
      totalPlayers: 7,
      unevenTeams: true,
    });
  });

  it.each([
    ['sin competición', undefined, { teamA: 'ana', teamB: 'bea' }],
    ['sin capitán A', 'comp-1', { teamA: '', teamB: 'bea' }],
    ['sin capitán B', 'comp-1', { teamA: 'ana' }],
  ])('N2: %s no llega a pedirse', async (_, id, capitanes) => {
    await expect(useCase.execute(id, capitanes)).rejects.toThrow();
    expect(repositorio.nameCaptains).not.toHaveBeenCalled();
  });

  it('N3: los errores del servidor llegan tal cual', async () => {
    const error = Object.assign(new Error('Los capitanes tienen que ser jugadores inscritos'), {
      status: 400,
    });
    repositorio.nameCaptains.mockRejectedValue(error);

    await expect(useCase.execute('comp-1', { teamA: 'ana', teamB: 'bea' })).rejects.toBe(error);
  });
});
