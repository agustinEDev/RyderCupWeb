import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpdateMatchStatusUseCase from './UpdateMatchStatusUseCase';

describe('UpdateMatchStatusUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = { updateMatchStatus: vi.fn() };
    useCase = new UpdateMatchStatusUseCase({ scheduleRepository });
  });

  it('should update match status with action', async () => {
    scheduleRepository.updateMatchStatus.mockResolvedValue({ status: 'IN_PROGRESS' });

    const result = await useCase.execute('m-1', 'start');
    expect(scheduleRepository.updateMatchStatus).toHaveBeenCalledWith('m-1', 'start', null);
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('should update match status with action and result', async () => {
    const matchResult = { score: '3&2' };
    scheduleRepository.updateMatchStatus.mockResolvedValue({ status: 'COMPLETED' });

    await useCase.execute('m-1', 'complete', matchResult);
    expect(scheduleRepository.updateMatchStatus).toHaveBeenCalledWith('m-1', 'complete', matchResult);
  });

  it('should throw if matchId is missing', async () => {
    await expect(useCase.execute('', 'start')).rejects.toThrow('Match ID is required');
  });

  it('should throw if action is missing', async () => {
    await expect(useCase.execute('m-1', '')).rejects.toThrow('Action is required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.updateMatchStatus.mockRejectedValue(new Error('Invalid transition'));
    await expect(useCase.execute('m-1', 'start')).rejects.toThrow('Invalid transition');
  });
});
