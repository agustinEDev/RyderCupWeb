import { describe, it, expect, vi, beforeEach } from 'vitest';
import GetAdminStatsUseCase from './GetAdminStatsUseCase';

describe('GetAdminStatsUseCase', () => {
  let adminRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    adminRepository = { getStats: vi.fn() };
    useCase = new GetAdminStatsUseCase({ adminRepository });
  });

  it('should return the stats from the repository', async () => {
    const stats = {
      totalUsers: 9,
      totalCompetitions: 1,
      totalQuickMatches: 25,
      totalGolfCoursesApproved: 1,
      totalGolfCoursesPending: 0,
    };
    adminRepository.getStats.mockResolvedValue(stats);

    const result = await useCase.execute();

    expect(adminRepository.getStats).toHaveBeenCalledWith();
    expect(result).toEqual(stats);
  });

  it('should propagate repository errors', async () => {
    adminRepository.getStats.mockRejectedValue(new Error('Network error'));

    await expect(useCase.execute()).rejects.toThrow('Network error');
  });
});
