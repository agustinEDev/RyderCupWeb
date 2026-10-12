import { describe, it, expect, vi } from 'vitest';
import UpdateStrokePlaySettingsUseCase from './UpdateStrokePlaySettingsUseCase';
import { StrokePlaySetup } from '../../../domain/value_objects/StrokePlaySetup';

/**
 * Cambiar los ajustes de un Stableford o un Medal (FE #824, RyderCupAm#536).
 */
const conRepositorio = () => {
  const competitionRepository = {
    updateStrokePlay: vi.fn().mockResolvedValue(
      new StrokePlaySetup({ categoryCount: 3, maxMatchdaysPerPlayer: 2 })
    ),
  };
  return { competitionRepository, caso: new UpdateStrokePlaySettingsUseCase({ competitionRepository }) };
};

describe('UpdateStrokePlaySettingsUseCase (FE #824)', () => {
  it('U1: pasa los cambios al repositorio y devuelve un objeto plano', async () => {
    const { competitionRepository, caso } = conRepositorio();

    const resultado = await caso.execute('c-1', { categoryCount: 3 });

    expect(competitionRepository.updateStrokePlay).toHaveBeenCalledWith('c-1', { categoryCount: 3 });
    expect(resultado).toEqual({
      categoryLimits: [],
      categoryCount: 3,
      maxMatchdaysPerPlayer: 2,
      overallStanding: 'ACCUMULATED',
    });
  });

  it('U2: sin id no llama a nadie', async () => {
    const { competitionRepository, caso } = conRepositorio();

    await expect(caso.execute('', { categoryCount: 3 })).rejects.toThrow();
    expect(competitionRepository.updateStrokePlay).not.toHaveBeenCalled();
  });

  it('U3: sin cambios no llama a nadie', async () => {
    const { competitionRepository, caso } = conRepositorio();

    await expect(caso.execute('c-1', {})).rejects.toThrow();
    expect(competitionRepository.updateStrokePlay).not.toHaveBeenCalled();
  });

  it('U4: límites y contador a la vez no se mandan (el backend da un 400)', async () => {
    const { competitionRepository, caso } = conRepositorio();

    await expect(caso.execute('c-1', { categoryLimits: [12], categoryCount: 3 })).rejects.toThrow();
    expect(competitionRepository.updateStrokePlay).not.toHaveBeenCalled();
  });
});
