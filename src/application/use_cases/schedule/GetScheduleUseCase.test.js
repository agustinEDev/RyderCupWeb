import { describe, it, expect, vi, beforeEach } from 'vitest';
import GetScheduleUseCase from './GetScheduleUseCase';

describe('GetScheduleUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = { getSchedule: vi.fn() };
    useCase = new GetScheduleUseCase({ scheduleRepository });
  });

  it('should return schedule for a competition', async () => {
    const mockSchedule = { competitionId: 'comp-1', rounds: [] };
    scheduleRepository.getSchedule.mockResolvedValue(mockSchedule);

    const result = await useCase.execute('comp-1');
    expect(scheduleRepository.getSchedule).toHaveBeenCalledWith('comp-1');
    expect(result).toEqual(mockSchedule);
  });

  it('should throw if competitionId is missing', async () => {
    await expect(useCase.execute()).rejects.toThrow('Competition ID is required');
    await expect(useCase.execute('')).rejects.toThrow('Competition ID is required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.getSchedule.mockRejectedValue(new Error('Network error'));
    await expect(useCase.execute('comp-1')).rejects.toThrow('Network error');
  });
});
