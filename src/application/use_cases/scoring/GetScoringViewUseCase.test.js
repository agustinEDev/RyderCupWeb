import { describe, it, expect, vi, beforeEach } from 'vitest';
import GetScoringViewUseCase from './GetScoringViewUseCase';

describe('GetScoringViewUseCase', () => {
  let scoringRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scoringRepository = { getScoringView: vi.fn() };
    useCase = new GetScoringViewUseCase({ scoringRepository });
  });

  it('should return scoring view for a match', async () => {
    const mockView = { matchId: 'm-1', matchFormat: 'SINGLES', matchStatus: 'IN_PROGRESS' };
    scoringRepository.getScoringView.mockResolvedValue(mockView);

    const result = await useCase.execute('m-1');
    expect(scoringRepository.getScoringView).toHaveBeenCalledWith('m-1');
    expect(result).toEqual(mockView);
  });

  it('should throw if matchId is empty string', async () => {
    await expect(useCase.execute('')).rejects.toThrow('Match ID is required');
  });

  it('should throw if matchId is null', async () => {
    await expect(useCase.execute(null)).rejects.toThrow('Match ID is required');
  });

  it('should throw if matchId is undefined', async () => {
    await expect(useCase.execute(undefined)).rejects.toThrow('Match ID is required');
  });

  it('should propagate repository errors', async () => {
    scoringRepository.getScoringView.mockRejectedValue(new Error('Not found'));
    await expect(useCase.execute('m-1')).rejects.toThrow('Not found');
  });

  it('should not call repository when matchId is missing', async () => {
    await expect(useCase.execute('')).rejects.toThrow();
    expect(scoringRepository.getScoringView).not.toHaveBeenCalled();
  });
});
