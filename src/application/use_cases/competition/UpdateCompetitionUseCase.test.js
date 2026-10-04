import { describe, it, expect, vi } from 'vitest';
import UpdateCompetitionUseCase from './UpdateCompetitionUseCase';

/**
 * Editar una competición (FE #791).
 *
 * Exigía los dos nombres de equipo a toda competición. Un Stableford no los
 * tiene y el formulario ya no los manda: el caso de uso lo paraba antes de
 * llegar al servidor. Los equipos de una Ryder los valida el formulario, y el
 * servidor los valida todos.
 */
const datos = (extra = {}) => ({
  name: 'Stableford del club',
  start_date: '2030-06-01',
  end_date: '2030-06-02',
  ...extra,
});

const conRepositorio = () => {
  const competitionRepository = { updateCompetition: vi.fn().mockResolvedValue({ id: 'c-1' }) };
  return { useCase: new UpdateCompetitionUseCase({ competitionRepository }), competitionRepository };
};

describe('UpdateCompetitionUseCase (FE #791)', () => {
  it('U1: sin nombres de equipo llega al servidor', async () => {
    const { useCase, competitionRepository } = conRepositorio();

    await useCase.execute('c-1', datos());

    expect(competitionRepository.updateCompetition).toHaveBeenCalledWith('c-1', datos());
  });

  it('U2: con ellos, también', async () => {
    const { useCase, competitionRepository } = conRepositorio();

    await useCase.execute('c-1', datos({ team_1_name: 'Europa', team_2_name: 'USA' }));

    expect(competitionRepository.updateCompetition).toHaveBeenCalled();
  });
});
