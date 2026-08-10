import { describe, it, expect, vi } from 'vitest';
import GetPlayerStatsByGolfCourseUseCase from './GetPlayerStatsByGolfCourseUseCase';

describe('GetPlayerStatsByGolfCourseUseCase', () => {
  it('asks the repository for that course', async () => {
    const playerStatsRepository = { getPlayerStatsByGolfCourse: vi.fn().mockResolvedValue({}) };

    await new GetPlayerStatsByGolfCourseUseCase({ playerStatsRepository }).execute('course-1');

    expect(playerStatsRepository.getPlayerStatsByGolfCourse).toHaveBeenCalledWith('course-1');
  });

  it('refuses to ask for no course at all', async () => {
    const playerStatsRepository = { getPlayerStatsByGolfCourse: vi.fn() };

    await expect(
      new GetPlayerStatsByGolfCourseUseCase({ playerStatsRepository }).execute()
    ).rejects.toThrow('requires a golfCourseId');
    expect(playerStatsRepository.getPlayerStatsByGolfCourse).not.toHaveBeenCalled();
  });

  it('refuses to be built without a repository', () => {
    expect(() => new GetPlayerStatsByGolfCourseUseCase({})).toThrow('requires playerStatsRepository');
  });
});
