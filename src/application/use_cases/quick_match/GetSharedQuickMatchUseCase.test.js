import { describe, it, expect, vi } from 'vitest';
import GetSharedQuickMatchUseCase from './GetSharedQuickMatchUseCase';
import QuickMatch from '../../../domain/entities/QuickMatch';
import QuickMatchStatus from '../../../domain/value_objects/QuickMatchStatus';

const partida = QuickMatch.fromPersistence({
  id: 'qm-1',
  creatorId: 'user-1',
  golfCourseId: 'course-1',
  matchFormat: null,
  scoringFormat: 'STABLEFORD',
  status: QuickMatchStatus.completed(),
  participants: [{ participantId: 'p-1', userId: 'user-1', name: null, handicap: 10, team: null, isGuest: false }],
  scorerIds: ['p-1'],
});

describe('GetSharedQuickMatchUseCase (K)', () => {
  it('requires the repository and an id', async () => {
    expect(() => new GetSharedQuickMatchUseCase({})).toThrow('requires quickMatchRepository');
    const useCase = new GetSharedQuickMatchUseCase({ quickMatchRepository: { getShared: vi.fn() } });
    await expect(useCase.execute()).rejects.toThrow('quickMatchId is required');
  });

  it('returns the same DTO as the quick match plus readOnly and viewerIsParticipant', async () => {
    const getShared = vi.fn().mockResolvedValue({ quickMatch: partida, readOnly: true, viewerIsParticipant: false });
    const useCase = new GetSharedQuickMatchUseCase({ quickMatchRepository: { getShared } });

    const dto = await useCase.execute('qm-1');

    expect(getShared).toHaveBeenCalledWith('qm-1');
    expect(dto).toMatchObject({
      id: 'qm-1',
      golfCourseId: 'course-1',
      scoringFormat: 'STABLEFORD',
      isCompleted: true,
      readOnly: true,
      viewerIsParticipant: false,
    });
    expect(dto.participants[0].name).toBeNull();
  });
});
