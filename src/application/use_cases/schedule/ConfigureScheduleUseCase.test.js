import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConfigureScheduleUseCase from './ConfigureScheduleUseCase';

describe('ConfigureScheduleUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = { configureSchedule: vi.fn() };
    useCase = new ConfigureScheduleUseCase({ scheduleRepository });
  });

  it('should configure schedule successfully', async () => {
    const config = { num_rounds: 3 };
    scheduleRepository.configureSchedule.mockResolvedValue({ success: true });

    const result = await useCase.execute('comp-1', config);
    expect(scheduleRepository.configureSchedule).toHaveBeenCalledWith('comp-1', config);
    expect(result.success).toBe(true);
  });

  it('should throw if competitionId is missing', async () => {
    await expect(useCase.execute('', {})).rejects.toThrow('Competition ID is required');
  });

  it('should throw if config is missing', async () => {
    await expect(useCase.execute('comp-1', null)).rejects.toThrow('Schedule configuration is required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.configureSchedule.mockRejectedValue(new Error('Server error'));
    await expect(useCase.execute('comp-1', {})).rejects.toThrow('Server error');
  });
});
