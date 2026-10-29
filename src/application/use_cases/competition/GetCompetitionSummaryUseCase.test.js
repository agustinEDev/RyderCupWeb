import { describe, it, expect, vi } from 'vitest';
import GetCompetitionSummaryUseCase from './GetCompetitionSummaryUseCase';

describe('GetCompetitionSummaryUseCase', () => {
  it('pide el resumen al repositorio', async () => {
    const resumen = { id: 'c-1', hasTeams: false, visibility: 'PUBLIC' };
    const competitionRepository = { findSummary: vi.fn().mockResolvedValue(resumen) };

    const resultado = await new GetCompetitionSummaryUseCase({ competitionRepository }).execute('c-1');

    expect(resultado).toBe(resumen);
    expect(competitionRepository.findSummary).toHaveBeenCalledWith('c-1');
  });

  it('sin id no pregunta', async () => {
    const competitionRepository = { findSummary: vi.fn() };

    await expect(new GetCompetitionSummaryUseCase({ competitionRepository }).execute('')).rejects.toThrow(
      'Competition ID is required',
    );
    expect(competitionRepository.findSummary).not.toHaveBeenCalled();
  });
});
