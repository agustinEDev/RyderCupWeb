import { describe, it, expect, vi } from 'vitest';
import GetScoringBreakdownUseCase from './GetScoringBreakdownUseCase';

describe('GetScoringBreakdownUseCase', () => {
  it('pide el desglose al repositorio', async () => {
    const desglose = { holesCounted: 9 };
    const playerStatsRepository = { getScoringBreakdown: vi.fn().mockResolvedValue(desglose) };

    const resultado = await new GetScoringBreakdownUseCase({ playerStatsRepository }).execute();

    expect(resultado).toBe(desglose);
    expect(playerStatsRepository.getScoringBreakdown).toHaveBeenCalledTimes(1);
  });

  it('exige el repositorio al construirse', () => {
    expect(() => new GetScoringBreakdownUseCase({})).toThrow(
      'GetScoringBreakdownUseCase requires playerStatsRepository'
    );
  });
});
