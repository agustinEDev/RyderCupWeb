import { describe, it, expect, vi } from 'vitest';
import GetGamesTogetherUseCase from './GetGamesTogetherUseCase';

describe('GetGamesTogetherUseCase', () => {
  it('requires a repository', () => {
    expect(() => new GetGamesTogetherUseCase({})).toThrow(
      'GetGamesTogetherUseCase requires socialFeedRepository'
    );
  });

  it('requires the player id', async () => {
    const socialFeedRepository = { getGamesTogether: vi.fn() };
    const useCase = new GetGamesTogetherUseCase({ socialFeedRepository });

    await expect(useCase.execute()).rejects.toThrow('GetGamesTogetherUseCase requires a userId');
    expect(socialFeedRepository.getGamesTogether).not.toHaveBeenCalled();
  });

  it('asks the repository for the page after the cursor', async () => {
    const pagina = { games: [], nextCursor: null };
    const socialFeedRepository = { getGamesTogether: vi.fn().mockResolvedValue(pagina) };
    const useCase = new GetGamesTogetherUseCase({ socialFeedRepository });

    expect(await useCase.execute('u1', { cursor: 'c1' })).toBe(pagina);
    expect(socialFeedRepository.getGamesTogether).toHaveBeenCalledWith('u1', { cursor: 'c1' });
  });

  it('asks for the first page without a cursor', async () => {
    const socialFeedRepository = {
      getGamesTogether: vi.fn().mockResolvedValue({ games: [], nextCursor: null }),
    };
    const useCase = new GetGamesTogetherUseCase({ socialFeedRepository });

    await useCase.execute('u1');
    expect(socialFeedRepository.getGamesTogether).toHaveBeenCalledWith('u1', { cursor: null });
  });
});
