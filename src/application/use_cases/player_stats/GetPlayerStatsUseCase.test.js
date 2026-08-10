import { describe, it, expect, vi } from 'vitest';
import GetPlayerStatsUseCase from './GetPlayerStatsUseCase';
import PlayerStats from '../../../domain/entities/PlayerStats';

describe('GetPlayerStatsUseCase', () => {
  it('returns the stats the repository gives back', async () => {
    const expected = PlayerStats.fromPersistence({ handicap: 14.2, estimatedIndex: 12.8 });
    const playerStatsRepository = { getPlayerStats: vi.fn().mockResolvedValue(expected) };

    const result = await new GetPlayerStatsUseCase({ playerStatsRepository }).execute();

    expect(result).toBe(expected);
    expect(playerStatsRepository.getPlayerStats).toHaveBeenCalledTimes(1);
  });

  it('lets a failure through instead of swallowing it', async () => {
    const playerStatsRepository = {
      getPlayerStats: vi.fn().mockRejectedValue(new Error('Network error')),
    };

    await expect(new GetPlayerStatsUseCase({ playerStatsRepository }).execute()).rejects.toThrow(
      'Network error'
    );
  });

  it('refuses to be built without a repository', () => {
    expect(() => new GetPlayerStatsUseCase({})).toThrow('requires playerStatsRepository');
  });
});
