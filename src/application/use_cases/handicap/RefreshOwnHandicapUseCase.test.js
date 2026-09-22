import { describe, it, expect, vi } from 'vitest';
import RefreshOwnHandicapUseCase from './RefreshOwnHandicapUseCase';

describe('RefreshOwnHandicapUseCase (FE #677)', () => {
  it('U1: delega en el repositorio y devuelve lo que diga', async () => {
    const handicapRepository = {
      refreshMine: vi.fn().mockResolvedValue({ needsHandicap: false, handicap: 12.4 }),
    };

    const resultado = await new RefreshOwnHandicapUseCase({ handicapRepository }).execute();

    expect(handicapRepository.refreshMine).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ needsHandicap: false, handicap: 12.4 });
  });
});
