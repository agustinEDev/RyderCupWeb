import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpdateRoundUseCase from './UpdateRoundUseCase';

describe('UpdateRoundUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = { updateRound: vi.fn() };
    useCase = new UpdateRoundUseCase({ scheduleRepository });
  });

  it('should update a round successfully', async () => {
    const roundData = { date: '2025-06-16' };
    scheduleRepository.updateRound.mockResolvedValue({ id: 'r-1', date: '2025-06-16' });

    const result = await useCase.execute('r-1', roundData);
    expect(scheduleRepository.updateRound).toHaveBeenCalledWith('r-1', roundData);
    expect(result.date).toBe('2025-06-16');
  });

  it('should throw if roundId is missing', async () => {
    await expect(useCase.execute('', {})).rejects.toThrow('Round ID is required');
  });

  it('should throw if roundData is missing', async () => {
    await expect(useCase.execute('r-1', null)).rejects.toThrow('Round data is required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.updateRound.mockRejectedValue(new Error('Not found'));
    await expect(useCase.execute('r-1', {})).rejects.toThrow('Not found');
  });
});
