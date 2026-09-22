import { describe, it, expect, vi, beforeEach } from 'vitest';
import FillCaptainUseCase from './FillCaptainUseCase';

/**
 * Cubrir el puesto de un capitán que se fue (FE #692, RyderCupAm#320).
 *
 * Solo sirve para un puesto vacío: a un capitán que sigue no se le cambia así,
 * porque habría que rehacer los equipos. Eso lo hace cumplir el servidor.
 */
describe('FillCaptainUseCase', () => {
  let repositorio;
  let useCase;

  beforeEach(() => {
    repositorio = { fillTeamCaptain: vi.fn() };
    useCase = new FillCaptainUseCase({ competitionRepository: repositorio });
  });

  it('F1: manda el equipo y el jugador, y traduce la respuesta', async () => {
    repositorio.fillTeamCaptain.mockResolvedValue({
      id: 'comp-1',
      team_a_captain_id: 'carla',
      team_b_captain_id: 'bea',
      team_a_vice_captain_id: null,
      team_b_vice_captain_id: null,
    });

    const resultado = await useCase.execute('comp-1', 'A', 'carla');

    expect(repositorio.fillTeamCaptain).toHaveBeenCalledWith('comp-1', 'A', {
      player_id: 'carla',
    });
    expect(resultado).toEqual({
      id: 'comp-1',
      captains: { teamA: 'carla', teamB: 'bea', viceTeamA: null, viceTeamB: null },
    });
  });

  it.each([
    ['sin competición', undefined, 'A', 'carla'],
    ['sin equipo', 'comp-1', '', 'carla'],
    ['un equipo que no existe', 'comp-1', 'C', 'carla'],
    ['sin jugador', 'comp-1', 'A', ''],
  ])('F2: %s no llega a pedirse', async (_, id, equipo, jugador) => {
    await expect(useCase.execute(id, equipo, jugador)).rejects.toThrow();
    expect(repositorio.fillTeamCaptain).not.toHaveBeenCalled();
  });

  it('F3: los errores del servidor llegan tal cual', async () => {
    const error = Object.assign(new Error('Ese equipo ya tiene capitán'), { status: 400 });
    repositorio.fillTeamCaptain.mockRejectedValue(error);

    await expect(useCase.execute('comp-1', 'A', 'carla')).rejects.toBe(error);
  });
});
