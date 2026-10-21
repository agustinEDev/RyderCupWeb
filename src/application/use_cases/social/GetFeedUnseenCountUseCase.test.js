import { describe, it, expect, vi } from 'vitest';
import GetFeedUnseenCountUseCase from './GetFeedUnseenCountUseCase';

describe('GetFeedUnseenCountUseCase', () => {
  it('requires a repository', () => {
    expect(() => new GetFeedUnseenCountUseCase({})).toThrow(
      'GetFeedUnseenCountUseCase requires socialFeedRepository'
    );
  });

  it('returns the number from the repository', async () => {
    const socialFeedRepository = { getUnseenCount: vi.fn().mockResolvedValue(7) };
    const useCase = new GetFeedUnseenCountUseCase({ socialFeedRepository });

    expect(await useCase.execute()).toBe(7);
    expect(socialFeedRepository.getUnseenCount).toHaveBeenCalledTimes(1);
  });

  it('lets the failure through', async () => {
    const socialFeedRepository = { getUnseenCount: vi.fn().mockRejectedValue(new Error('x')) };
    const useCase = new GetFeedUnseenCountUseCase({ socialFeedRepository });

    await expect(useCase.execute()).rejects.toThrow('x');
  });
});
