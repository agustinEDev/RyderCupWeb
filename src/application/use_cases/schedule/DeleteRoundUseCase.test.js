import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeleteRoundUseCase from './DeleteRoundUseCase';

describe('DeleteRoundUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = { deleteRound: vi.fn() };
    useCase = new DeleteRoundUseCase({ scheduleRepository });
  });

  it('should delete a round successfully', async () => {
    scheduleRepository.deleteRound.mockResolvedValue(undefined);

    await useCase.execute('r-1');
    expect(scheduleRepository.deleteRound).toHaveBeenCalledWith('r-1');
  });

  it('should throw if roundId is missing', async () => {
    await expect(useCase.execute('')).rejects.toThrow('Round ID is required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.deleteRound.mockRejectedValue(new Error('Forbidden'));
    await expect(useCase.execute('r-1')).rejects.toThrow('Forbidden');
  });
});
