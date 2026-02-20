import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useScoring } from './useScoring';

// Mock composition root
vi.mock('../composition', () => ({
  getScoringViewUseCase: { execute: vi.fn() },
  submitHoleScoreUseCase: { execute: vi.fn() },
  submitScorecardUseCase: { execute: vi.fn() },
  concedeMatchUseCase: { execute: vi.fn() },
}));

// Mock offline queue
vi.mock('../utils/scoringOfflineQueue', () => ({
  enqueue: vi.fn(),
  dequeue: vi.fn(),
  getAll: vi.fn(() => []),
  remove: vi.fn(),
  clear: vi.fn(),
  size: vi.fn(() => 0),
  getByMatch: vi.fn(() => []),
}));

// Mock session lock
vi.mock('../utils/scoringSessionLock', () => ({
  acquire: vi.fn(() => true),
  release: vi.fn(),
  refresh: vi.fn(),
  isLocked: vi.fn(() => false),
  getSession: vi.fn(() => null),
  onLockEvent: vi.fn(() => () => {}),
  closeChannel: vi.fn(),
}));

import {
  getScoringViewUseCase,
  submitHoleScoreUseCase,
  submitScorecardUseCase,
  concedeMatchUseCase,
} from '../composition';
import * as offlineQueue from '../utils/scoringOfflineQueue';
import * as sessionLock from '../utils/scoringSessionLock';

const mockScoringView = {
  matchId: 'm-1',
  matchNumber: 1,
  matchFormat: 'SINGLES',
  matchStatus: 'IN_PROGRESS',
  isDecided: false,
  decidedResult: null,
  players: [
    { userId: 'u1', userName: 'Player A', team: 'A' },
    { userId: 'u2', userName: 'Player B', team: 'B' },
  ],
  holes: Array.from({ length: 18 }, (_, i) => ({ holeNumber: i + 1, par: 4, strokeIndex: i + 1 })),
  scores: [],
  matchStanding: null,
  scorecardSubmittedBy: [],
};

describe('useScoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getScoringViewUseCase.execute.mockResolvedValue(mockScoringView);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('should load scoring view on mount', async () => {
    const { result } = renderHook(() => useScoring('m-1', 'u1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.scoringView).toEqual(mockScoringView);
    expect(getScoringViewUseCase.execute).toHaveBeenCalledWith('m-1');
  });

  it('should identify match player', async () => {
    const { result } = renderHook(() => useScoring('m-1', 'u1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isMatchPlayer).toBe(true);
  });

  it('should identify non-player spectator', async () => {
    const { result } = renderHook(() => useScoring('m-1', 'u99'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isMatchPlayer).toBe(false);
  });

  it('should start at hole 1', async () => {
    const { result } = renderHook(() => useScoring('m-1', 'u1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.currentHole).toBe(1);
  });

  it('should allow changing current hole', async () => {
    const { result } = renderHook(() => useScoring('m-1', 'u1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setCurrentHole(5));
    expect(result.current.currentHole).toBe(5);
  });

  it('should submit score', async () => {
    const updatedView = { ...mockScoringView, scores: [{ holeNumber: 1 }] };
    submitHoleScoreUseCase.execute.mockResolvedValue(updatedView);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.submitScore(1, { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 });
    });

    expect(submitHoleScoreUseCase.execute).toHaveBeenCalledWith('m-1', 1, {
      ownScore: 5,
      markedPlayerId: 'u2',
      markedScore: 4,
    });
    expect(result.current.scoringView.scores).toHaveLength(1);
  });

  it('should queue score when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.submitScore(1, { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 });
    });

    expect(offlineQueue.enqueue).toHaveBeenCalledWith('m-1', 1, {
      ownScore: 5,
      markedPlayerId: 'u2',
      markedScore: 4,
    });
    expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
  });

  it('should submit scorecard', async () => {
    const viewWith18Validated = {
      ...mockScoringView,
      scores: Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        playerScores: [{ userId: 'u1', validationStatus: 'match' }],
      })),
    };
    getScoringViewUseCase.execute.mockResolvedValue(viewWith18Validated);

    const mockSummary = { matchId: 'm-1', matchComplete: true };
    submitScorecardUseCase.execute.mockResolvedValue(mockSummary);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.submitScorecard();
    });

    expect(submitScorecardUseCase.execute).toHaveBeenCalledWith('m-1');
    expect(result.current.matchSummary).toEqual(mockSummary);
  });

  it('should concede match', async () => {
    concedeMatchUseCase.execute.mockResolvedValue({ status: 'CONCEDED' });

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.concedeMatch('A', 'Player injury');
    });

    expect(concedeMatchUseCase.execute).toHaveBeenCalledWith('m-1', 'A', 'Player injury');
  });

  it('should handle hasSubmitted correctly', async () => {
    const viewWithSubmit = {
      ...mockScoringView,
      scorecardSubmittedBy: ['u1'],
    };
    getScoringViewUseCase.execute.mockResolvedValue(viewWithSubmit);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasSubmitted).toBe(true);
  });

  it('should calculate validatedHoles', async () => {
    const viewWith5Validated = {
      ...mockScoringView,
      scores: Array.from({ length: 5 }, (_, i) => ({
        holeNumber: i + 1,
        playerScores: [{ userId: 'u1', validationStatus: 'match' }],
      })),
    };
    getScoringViewUseCase.execute.mockResolvedValue(viewWith5Validated);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.validatedHoles).toBe(5);
  });

  it('should try to acquire session lock for match players', async () => {
    const { result } = renderHook(() => useScoring('m-1', 'u1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(sessionLock.acquire).toHaveBeenCalled();
  });

  it('should set isSessionBlocked when lock cannot be acquired', async () => {
    sessionLock.acquire.mockReturnValue(false);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isSessionBlocked).toBe(true);
  });

  it('should handle fetch error', async () => {
    getScoringViewUseCase.execute.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });

  it('should not submit score if not match player', async () => {
    const { result } = renderHook(() => useScoring('m-1', 'u99'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.submitScore(1, { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 });
    });

    expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
  });

  it('should adjust totalHoles when match is decided early', async () => {
    const decidedView = {
      ...mockScoringView,
      isDecided: true,
      decidedResult: { winner: 'A', score: '5&4' },
      matchStanding: { status: '5UP', leadingTeam: 'A', holesPlayed: 14, holesRemaining: 4 },
    };
    getScoringViewUseCase.execute.mockResolvedValue(decidedView);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalHoles).toBe(14);
  });

  it('should release session lock on unmount', async () => {
    const { result, unmount } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    unmount();
    expect(sessionLock.release).toHaveBeenCalled();
  });
});
