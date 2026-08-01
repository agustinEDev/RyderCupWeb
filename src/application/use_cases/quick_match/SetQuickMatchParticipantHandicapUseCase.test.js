import { describe, it, expect, vi, beforeEach } from 'vitest';
import SetQuickMatchParticipantHandicapUseCase from './SetQuickMatchParticipantHandicapUseCase';
import QuickMatch from '../../../domain/entities/QuickMatch';
import QuickMatchStatus from '../../../domain/value_objects/QuickMatchStatus';

const mockQuickMatch = QuickMatch.fromPersistence({
  id: 'qm-1',
  creatorId: 'user-1',
  golfCourseId: 'course-1',
  matchFormat: 'SINGLES',
  status: QuickMatchStatus.pending(),
  participants: [
    { participantId: 'user-1', userId: 'user-1', name: 'Creator', handicap: 10, team: null, isGuest: false },
    { participantId: 'user-2', userId: 'user-2', name: 'Friend', handicap: 16.4, team: null, isGuest: false },
  ],
  scorerIds: [],
});

describe('SetQuickMatchParticipantHandicapUseCase', () => {
  let useCase;
  let mockRepo;

  beforeEach(() => {
    mockRepo = { setParticipantHandicap: vi.fn().mockResolvedValue(mockQuickMatch) };
    useCase = new SetQuickMatchParticipantHandicapUseCase({ quickMatchRepository: mockRepo });
  });

  it('should throw if quickMatchRepository is missing', () => {
    expect(() => new SetQuickMatchParticipantHandicapUseCase({})).toThrow('requires quickMatchRepository');
  });

  it('should throw for a missing quickMatchId', async () => {
    await expect(useCase.execute('', 'user-2', 16.4)).rejects.toThrow('quickMatchId and participantId are required');
  });

  it('should throw for a missing participantId', async () => {
    await expect(useCase.execute('qm-1', '', 16.4)).rejects.toThrow('quickMatchId and participantId are required');
  });

  it('should set the participant handicap and return a simple DTO', async () => {
    const result = await useCase.execute('qm-1', 'user-2', 16.4);

    expect(mockRepo.setParticipantHandicap).toHaveBeenCalledWith('qm-1', 'user-2', 16.4);
    expect(result.participants.find((p) => p.participantId === 'user-2').handicap).toBe(16.4);
  });

  it('should allow clearing the handicap with null', async () => {
    await useCase.execute('qm-1', 'user-2', null);

    expect(mockRepo.setParticipantHandicap).toHaveBeenCalledWith('qm-1', 'user-2', null);
  });

  it('should throw if handicap is below the valid range', async () => {
    await expect(useCase.execute('qm-1', 'user-2', -10.1)).rejects.toThrow(
      'Invalid handicap value. Must be between -10.0 and 54.0'
    );
    expect(mockRepo.setParticipantHandicap).not.toHaveBeenCalled();
  });

  it('should throw if handicap is above the valid range', async () => {
    await expect(useCase.execute('qm-1', 'user-2', 54.1)).rejects.toThrow(
      'Invalid handicap value. Must be between -10.0 and 54.0'
    );
    expect(mockRepo.setParticipantHandicap).not.toHaveBeenCalled();
  });

  it('should accept handicap at the range boundaries', async () => {
    await useCase.execute('qm-1', 'user-2', -10);
    await useCase.execute('qm-1', 'user-2', 54);

    expect(mockRepo.setParticipantHandicap).toHaveBeenCalledWith('qm-1', 'user-2', -10);
    expect(mockRepo.setParticipantHandicap).toHaveBeenCalledWith('qm-1', 'user-2', 54);
  });
});
