import { describe, it, expect, vi } from 'vitest';
import RetireTeeGroupPlayerUseCase from './RetireTeeGroupPlayerUseCase';

/** El organizador retira a quien ya jugó (RyderCupAm#553, FE-A). */
describe('RetireTeeGroupPlayerUseCase', () => {
  it('llama al repositorio con la partida y el jugador', async () => {
    const repo = { retirePlayer: vi.fn().mockResolvedValue({ matchId: 'g-1' }) };

    const vista = await new RetireTeeGroupPlayerUseCase({ teeGroupScoringRepository: repo }).execute('g-1', 'ana');

    expect(repo.retirePlayer).toHaveBeenCalledWith('g-1', 'ana');
    expect(vista.matchId).toBe('g-1');
  });

  it.each([[null, 'ana'], ['g-1', null]])('sin partida o sin jugador, error', async (grupo, jugador) => {
    const repo = { retirePlayer: vi.fn() };

    await expect(new RetireTeeGroupPlayerUseCase({ teeGroupScoringRepository: repo }).execute(grupo, jugador)).rejects.toThrow();
    expect(repo.retirePlayer).not.toHaveBeenCalled();
  });
});
