import { describe, it, expect, vi, beforeEach } from 'vitest';
import GetMatchDetailUseCase from './GetMatchDetailUseCase';

describe('GetMatchDetailUseCase', () => {
  let scheduleRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scheduleRepository = { getMatchDetail: vi.fn() };
    useCase = new GetMatchDetailUseCase({ scheduleRepository });
  });

  it('should return match detail', async () => {
    const mockMatch = { id: 'm-1', matchNumber: 1, status: 'SCHEDULED' };
    scheduleRepository.getMatchDetail.mockResolvedValue(mockMatch);

    const result = await useCase.execute('m-1');
    expect(scheduleRepository.getMatchDetail).toHaveBeenCalledWith('m-1');
    expect(result).toEqual(mockMatch);
  });

  it('should throw if matchId is missing', async () => {
    await expect(useCase.execute('')).rejects.toThrow('Match ID is required');
  });

  it('should propagate repository errors', async () => {
    scheduleRepository.getMatchDetail.mockRejectedValue(new Error('Not found'));
    await expect(useCase.execute('m-1')).rejects.toThrow('Not found');
  });
});
