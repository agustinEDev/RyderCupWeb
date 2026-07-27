import { describe, it, expect, vi, beforeEach } from 'vitest';
import StartQuickMatchUseCase from './StartQuickMatchUseCase';
import QuickMatch from '../../../domain/entities/QuickMatch';
import QuickMatchStatus from '../../../domain/value_objects/QuickMatchStatus';

const mockQuickMatch = QuickMatch.fromPersistence({
  id: 'qm-1',
  creatorId: 'user-1',
  golfCourseId: 'course-1',
  matchFormat: 'SINGLES',
  status: QuickMatchStatus.inProgress(),
  participants: [{ participantId: 'p-1', userId: 'user-1', name: 'Creator', handicap: 10, team: null, isGuest: false }],
  scorerIds: ['p-1'],
});

describe('StartQuickMatchUseCase', () => {
  let useCase;
  let mockRepo;

  beforeEach(() => {
    mockRepo = { start: vi.fn().mockResolvedValue(mockQuickMatch) };
    useCase = new StartQuickMatchUseCase({ quickMatchRepository: mockRepo });
  });

  it('should throw if quickMatchRepository is missing', () => {
    expect(() => new StartQuickMatchUseCase({})).toThrow('requires quickMatchRepository');
  });

  it('should throw for a missing quickMatchId', async () => {
    await expect(useCase.execute('', ['p-1'])).rejects.toThrow('quickMatchId is required');
  });

  it('should throw for an empty scorerIds array', async () => {
    await expect(useCase.execute('qm-1', [])).rejects.toThrow('scorerIds must be a non-empty array');
  });

  it('should start the quick match and return a simple DTO', async () => {
    const result = await useCase.execute('qm-1', ['p-1']);

    expect(mockRepo.start).toHaveBeenCalledWith('qm-1', ['p-1']);
    expect(result.isInProgress).toBe(true);
    expect(result.scorerIds).toEqual(['p-1']);
  });
});
