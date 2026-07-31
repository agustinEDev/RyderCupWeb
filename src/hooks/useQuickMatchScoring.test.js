import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useQuickMatchScoring } from './useQuickMatchScoring';

vi.mock('../composition', () => ({
  getQuickMatchUseCase: { execute: vi.fn() },
  getGolfCourseUseCase: { execute: vi.fn() },
  submitQuickMatchHoleScoreUseCase: { execute: vi.fn() },
  submitQuickMatchProxyHoleScoreUseCase: { execute: vi.fn() },
  completeQuickMatchUseCase: { execute: vi.fn() },
}));

import {
  getQuickMatchUseCase,
  getGolfCourseUseCase,
} from '../composition';

const mockQuickMatch = {
  id: 'qm-1',
  creatorId: 'user-1',
  golfCourseId: 'course-1',
  matchFormat: 'SINGLES',
  status: 'IN_PROGRESS',
  isCompleted: false,
  participants: [
    { participantId: 'user-1', userId: 'user-1', name: 'Alice', handicap: null, team: null, isGuest: false },
    { participantId: 'user-2', userId: 'user-2', name: 'Bob', handicap: null, team: null, isGuest: false },
  ],
  scorerIds: ['user-1', 'user-2'],
  holeScores: [],
  standing: null,
  // Real backend shape: each scorer's assignment already includes themselves
  // in covered_participant_ids (self-coverage), not just delegated others.
  scoringAssignments: [
    { scorerParticipantId: 'user-1', scorerName: 'Alice', coveredParticipantIds: ['user-1'] },
    { scorerParticipantId: 'user-2', scorerName: 'Bob', coveredParticipantIds: ['user-2'] },
  ],
};

describe('useQuickMatchScoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getQuickMatchUseCase.execute.mockResolvedValue(mockQuickMatch);
    getGolfCourseUseCase.execute.mockResolvedValue({ holes: [] });
  });

  it('should not duplicate the current scorer in coveredParticipantIds (regression)', async () => {
    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isScorer).toBe(true);
    expect(result.current.coveredParticipantIds).toEqual(['user-1']);
  });

  it('should include delegated non-scorers alongside self-coverage', async () => {
    getQuickMatchUseCase.execute.mockResolvedValue({
      ...mockQuickMatch,
      participants: [
        ...mockQuickMatch.participants,
        { participantId: 'guest-1', userId: null, name: 'Guest', handicap: 10, team: null, isGuest: true },
      ],
      scoringAssignments: [
        { scorerParticipantId: 'user-1', scorerName: 'Alice', coveredParticipantIds: ['user-1', 'guest-1'] },
        { scorerParticipantId: 'user-2', scorerName: 'Bob', coveredParticipantIds: ['user-2'] },
      ],
    });

    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.coveredParticipantIds).toEqual(['user-1', 'guest-1']);
  });

  it('should return an empty coveredParticipantIds when the user is not a scorer', async () => {
    getQuickMatchUseCase.execute.mockResolvedValue({
      ...mockQuickMatch,
      participants: [
        ...mockQuickMatch.participants,
        { participantId: 'user-3', userId: 'user-3', name: 'Carol', handicap: null, team: null, isGuest: false },
      ],
    });

    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-3'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isScorer).toBe(false);
    expect(result.current.coveredParticipantIds).toEqual([]);
  });

  it('should fetch golf course holes once using the quick match golfCourseId', async () => {
    renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));

    await waitFor(() => expect(getGolfCourseUseCase.execute).toHaveBeenCalledWith('course-1'));
  });
});
