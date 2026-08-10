import { describe, it, expect, vi } from 'vitest';
import GetRecentMatchesUseCase from './GetRecentMatchesUseCase';

describe('GetRecentMatchesUseCase', () => {
  it('passes the limit through to the repository', async () => {
    const playerStatsRepository = { getRecentMatches: vi.fn().mockResolvedValue([]) };

    await new GetRecentMatchesUseCase({ playerStatsRepository }).execute(3);

    expect(playerStatsRepository.getRecentMatches).toHaveBeenCalledWith(3);
  });

  it('returns whatever the repository gives back', async () => {
    const matches = [{ id: 'a' }];
    const playerStatsRepository = { getRecentMatches: vi.fn().mockResolvedValue(matches) };

    const result = await new GetRecentMatchesUseCase({ playerStatsRepository }).execute();

    expect(result).toBe(matches);
  });

  it('refuses to be built without a repository', () => {
    expect(() => new GetRecentMatchesUseCase({})).toThrow('requires playerStatsRepository');
  });
});
