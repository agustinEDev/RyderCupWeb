import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubmitScorecardUseCase from './SubmitScorecardUseCase';

describe('SubmitScorecardUseCase', () => {
  let scoringRepository;
  let useCase;

  beforeEach(() => {
    vi.clearAllMocks();
    scoringRepository = { submitScorecard: vi.fn() };
    useCase = new SubmitScorecardUseCase({ scoringRepository });
  });

  it('should submit scorecard and return match summary', async () => {
    const mockSummary = {
      matchId: 'm-1',
      submittedBy: 'u1',
      result: { winner: 'A', score: '3&2' },
      matchComplete: true,
    };
    scoringRepository.submitScorecard.mockResolvedValue(mockSummary);

    const result = await useCase.execute('m-1');
    expect(scoringRepository.submitScorecard).toHaveBeenCalledWith('m-1');
    expect(result).toEqual(mockSummary);
  });

  it('should throw if matchId is empty', async () => {
    await expect(useCase.execute('')).rejects.toThrow('Match ID is required');
  });

  it('should throw if matchId is null', async () => {
    await expect(useCase.execute(null)).rejects.toThrow('Match ID is required');
  });

  it('should throw if matchId is undefined', async () => {
    await expect(useCase.execute(undefined)).rejects.toThrow('Match ID is required');
  });

  it('should propagate repository errors', async () => {
    scoringRepository.submitScorecard.mockRejectedValue(new Error('Not all holes validated'));
    await expect(useCase.execute('m-1')).rejects.toThrow('Not all holes validated');
  });

  it('should not call repository when matchId is missing', async () => {
    await expect(useCase.execute('')).rejects.toThrow();
    expect(scoringRepository.submitScorecard).not.toHaveBeenCalled();
  });
});
