import { describe, it, expect, vi } from 'vitest';
import DeleteTeeGroupHoleUseCase from './DeleteTeeGroupHoleUseCase';

/** El organizador borra lo anotado en un hoyo (RyderCupAm#553, FE-A). */
describe('DeleteTeeGroupHoleUseCase', () => {
  it.each(['own', 'marker', 'both'])('borra el lado %s', async (lado) => {
    const repo = { deleteHole: vi.fn().mockResolvedValue({ matchId: 'g-1' }) };

    await new DeleteTeeGroupHoleUseCase({ teeGroupScoringRepository: repo }).execute('g-1', 'ana', 7, lado);

    expect(repo.deleteHole).toHaveBeenCalledWith('g-1', 'ana', 7, lado);
  });

  it.each([
    ['sin partida', [null, 'ana', 7, 'own']],
    ['sin jugador', ['g-1', null, 7, 'own']],
    ['hoyo 0', ['g-1', 'ana', 0, 'own']],
    ['hoyo 19', ['g-1', 'ana', 19, 'own']],
    ['un lado que no existe', ['g-1', 'ana', 7, 'all']],
  ])('%s, error sin llamar', async (_caso, args) => {
    const repo = { deleteHole: vi.fn() };

    await expect(new DeleteTeeGroupHoleUseCase({ teeGroupScoringRepository: repo }).execute(...args)).rejects.toThrow();
    expect(repo.deleteHole).not.toHaveBeenCalled();
  });
});
