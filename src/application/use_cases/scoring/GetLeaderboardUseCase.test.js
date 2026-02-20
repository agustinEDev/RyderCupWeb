import { describe, it, expect, vi, beforeEach } from 'vitest';
import GetLeaderboardUseCase from './GetLeaderboardUseCase';

describe('GetLeaderboardUseCase', () => {
  let scoringRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scoringRepository = { getLeaderboard: vi.fn() };
    useCase = new GetLeaderboardUseCase({ scoringRepository });
  });

  it('should return leaderboard for a competition', async () => {
    const mockLeaderboard = {
      competitionId: 'comp-1',
      teamAPoints: 4.5,
      teamBPoints: 3.5,
      matches: [],
    };
    scoringRepository.getLeaderboard.mockResolvedValue(mockLeaderboard);

    const result = await useCase.execute('comp-1');
    expect(scoringRepository.getLeaderboard).toHaveBeenCalledWith('comp-1');
    expect(result).toEqual(mockLeaderboard);
  });

  it('should throw if competitionId is empty', async () => {
    await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
  });

  it('should throw if competitionId is null', async () => {
    await expect(useCase.execute(null)).rejects.toThrow('Competition ID is required');
  });

  it('should throw if competitionId is undefined', async () => {
    await expect(useCase.execute(undefined)).rejects.toThrow('Competition ID is required');
  });

  it('should propagate repository errors', async () => {
    scoringRepository.getLeaderboard.mockRejectedValue(new Error('Not found'));
    await expect(useCase.execute('comp-1')).rejects.toThrow('Not found');
  });

  it('should not call repository when competitionId is missing', async () => {
    await expect(useCase.execute('')).rejects.toThrow();
    expect(scoringRepository.getLeaderboard).not.toHaveBeenCalled();
  });
});
