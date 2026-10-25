import { describe, it, expect, vi } from 'vitest';
import WithdrawMatchPlayerUseCase from './WithdrawMatchPlayerUseCase';

/** Retirar o devolver a un jugador de un fourball (25 oct 2026). */
describe('WithdrawMatchPlayerUseCase', () => {
  const repo = () => ({ withdrawPlayer: vi.fn().mockResolvedValue('r'), reinstatePlayer: vi.fn().mockResolvedValue('v') });

  it('retira, o devuelve con deshacer', async () => {
    const scoringRepository = repo();
    const caso = new WithdrawMatchPlayerUseCase({ scoringRepository });

    expect(await caso.execute('m-1', 'u-1')).toBe('r');
    expect(scoringRepository.withdrawPlayer).toHaveBeenCalledWith('m-1', 'u-1');
    expect(await caso.execute('m-1', 'u-1', { deshacer: true })).toBe('v');
    expect(scoringRepository.reinstatePlayer).toHaveBeenCalledWith('m-1', 'u-1');
  });

  it('sin partido o sin jugador, no llama', async () => {
    const scoringRepository = repo();
    const caso = new WithdrawMatchPlayerUseCase({ scoringRepository });

    await expect(caso.execute('', 'u-1')).rejects.toThrow();
    await expect(caso.execute('m-1', '')).rejects.toThrow();
    expect(scoringRepository.withdrawPlayer).not.toHaveBeenCalled();
  });
});
