import { describe, it, expect, vi, beforeEach } from 'vitest';
import HideQuickMatchUseCase from './HideQuickMatchUseCase';
import QuickMatch from '../../../domain/entities/QuickMatch';
import QuickMatchStatus from '../../../domain/value_objects/QuickMatchStatus';

const mockQuickMatch = QuickMatch.fromPersistence({
  id: 'qm-1',
  creatorId: 'user-1',
  golfCourseId: 'course-1',
  matchFormat: 'SINGLES',
  status: QuickMatchStatus.completed(),
  participants: [
    { participantId: 'p-1', userId: 'user-1', name: 'Creator', handicap: 10, team: null, isGuest: false },
  ],
  scorerIds: ['p-1'],
});

describe('HideQuickMatchUseCase', () => {
  let useCase;
  let mockRepo;

  beforeEach(() => {
    mockRepo = { hide: vi.fn().mockResolvedValue(mockQuickMatch) };
    useCase = new HideQuickMatchUseCase({ quickMatchRepository: mockRepo });
  });

  it('should throw if quickMatchRepository is missing', () => {
    expect(() => new HideQuickMatchUseCase({})).toThrow('requires quickMatchRepository');
  });

  it('should throw for a missing quickMatchId', async () => {
    await expect(useCase.execute('')).rejects.toThrow('quickMatchId is required');
  });

  it('should hide the quick match and return a simple DTO', async () => {
    const result = await useCase.execute('qm-1');

    expect(mockRepo.hide).toHaveBeenCalledWith('qm-1');
    expect(result.id).toBe('qm-1');
  });

  it('should propagate repository errors', async () => {
    mockRepo.hide.mockRejectedValue(new Error('Quick match not found'));

    await expect(useCase.execute('qm-1')).rejects.toThrow('Quick match not found');
  });
});
