import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateQuickMatchUseCase from './CreateQuickMatchUseCase';
import QuickMatch from '../../../domain/entities/QuickMatch';
import QuickMatchStatus from '../../../domain/value_objects/QuickMatchStatus';

const mockQuickMatch = QuickMatch.fromPersistence({
  id: 'qm-1',
  creatorId: 'user-1',
  golfCourseId: 'course-1',
  matchFormat: 'SINGLES',
  status: QuickMatchStatus.pending(),
  participants: [{ participantId: 'p-1', userId: 'user-1', name: 'Creator', handicap: 10, team: null, isGuest: false }],
  scorerIds: [],
});

describe('CreateQuickMatchUseCase', () => {
  let useCase;
  let mockRepo;

  beforeEach(() => {
    mockRepo = { create: vi.fn().mockResolvedValue(mockQuickMatch) };
    useCase = new CreateQuickMatchUseCase({ quickMatchRepository: mockRepo });
  });

  it('should throw if quickMatchRepository is missing', () => {
    expect(() => new CreateQuickMatchUseCase({})).toThrow('requires quickMatchRepository');
  });

  it('should throw for a missing golfCourseId', async () => {
    await expect(useCase.execute('', 'SINGLES')).rejects.toThrow('golfCourseId is required');
  });

  it('should throw when neither matchFormat nor scoringFormat is given', async () => {
    await expect(useCase.execute('course-1')).rejects.toThrow(
      'Exactly one of matchFormat or scoringFormat is required'
    );
  });

  it('should throw when both matchFormat and scoringFormat are given', async () => {
    await expect(useCase.execute('course-1', 'SINGLES', 'MEDAL')).rejects.toThrow(
      'Exactly one of matchFormat or scoringFormat is required'
    );
  });

  it('should create the quick match and return a simple DTO', async () => {
    const result = await useCase.execute('course-1', 'SINGLES');

    expect(mockRepo.create).toHaveBeenCalledWith('course-1', 'SINGLES', null, null);
    expect(result.id).toBe('qm-1');
    expect(result.isPending).toBe(true);
  });

  it('should create a free-play quick match with scoringFormat', async () => {
    await useCase.execute('course-1', null, 'STABLEFORD');

    expect(mockRepo.create).toHaveBeenCalledWith('course-1', null, 'STABLEFORD', null);
  });

  it('should pass the optional name through to the repository', async () => {
    await useCase.execute('course-1', 'SINGLES', null, 'Viernes con Rafa');

    expect(mockRepo.create).toHaveBeenCalledWith('course-1', 'SINGLES', null, 'Viernes con Rafa');
  });
});
