import { describe, it, expect, vi, beforeEach } from 'vitest';
import SubmitQuickMatchHoleScoreUseCase from './SubmitQuickMatchHoleScoreUseCase';

describe('SubmitQuickMatchHoleScoreUseCase', () => {
  let useCase;
  let mockRepo;

  beforeEach(() => {
    mockRepo = {
      submitHoleScore: vi.fn().mockResolvedValue({
        hole_number: 3,
        participant_id: 'p-1',
        score: 4,
        recorded_by_participant_id: 'p-1',
      }),
    };
    useCase = new SubmitQuickMatchHoleScoreUseCase({ quickMatchRepository: mockRepo });
  });

  it('should throw if quickMatchRepository is missing', () => {
    expect(() => new SubmitQuickMatchHoleScoreUseCase({})).toThrow('requires quickMatchRepository');
  });

  it('should throw for missing quickMatchId or holeNumber', async () => {
    await expect(useCase.execute('', 3, 4)).rejects.toThrow('quickMatchId and holeNumber are required');
    await expect(useCase.execute('qm-1', null, 4)).rejects.toThrow('quickMatchId and holeNumber are required');
  });

  it('should submit the score and return a camelCase DTO', async () => {
    const result = await useCase.execute('qm-1', 3, 4);

    expect(mockRepo.submitHoleScore).toHaveBeenCalledWith('qm-1', 3, 4);
    expect(result).toEqual({
      holeNumber: 3,
      participantId: 'p-1',
      score: 4,
      recordedByParticipantId: 'p-1',
    });
  });
});
