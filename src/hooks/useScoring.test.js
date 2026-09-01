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
  forceRelease: vi.fn(),
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
  markerAssignments: [
    { scorerUserId: 'u1', marksUserId: 'u2', markedByUserId: 'u2' },
    { scorerUserId: 'u2', marksUserId: 'u1', markedByUserId: 'u1' },
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

    // Con participante (null: es competición) y de quién es la anotación, para
    // que en un móvil compartido no la envíe ni la borre otra persona (FE #521)
    expect(offlineQueue.enqueue).toHaveBeenCalledWith(
      'm-1',
      1,
      { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 },
      null,
      'u1',
    );
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

  describe('submitting the scorecard', () => {
    const scoredHoles = (count, { validated = true, from = 1 } = {}) =>
      Array.from({ length: count }, (_, i) => ({
        holeNumber: from + i,
        playerScores: [{
          userId: 'u1',
          ownSubmitted: true,
          validationStatus: validated ? 'match' : 'pending',
        }],
      }));

    it('allows submitting a decided match with the holes actually played', async () => {
      // Won 9&7: the last seven holes are not played on purpose, and the API
      // takes the card — it only asks the played holes to be validated
      getScoringViewUseCase.execute.mockResolvedValue({
        ...mockScoringView,
        isDecided: true,
        decidedResult: { winner: 'A', score: '9&7' },
        scores: scoredHoles(11),
      });

      const { result } = renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canSubmitScorecard).toBe(true);
      // The card is complete at the hole it ended on: "11/18" would read unfinished
      expect(result.current.holesToSubmit).toBe(11);
    });

    it('holds back a decided match while a played hole is still unvalidated', async () => {
      getScoringViewUseCase.execute.mockResolvedValue({
        ...mockScoringView,
        isDecided: true,
        decidedResult: { winner: 'A', score: '9&7' },
        scores: [...scoredHoles(10), ...scoredHoles(1, { validated: false, from: 11 })],
      });

      const { result } = renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canSubmitScorecard).toBe(false);
    });

    it('still asks an undecided match for all 18 holes', async () => {
      getScoringViewUseCase.execute.mockResolvedValue({
        ...mockScoringView,
        scores: scoredHoles(17),
      });

      const { result } = renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canSubmitScorecard).toBe(false);
      expect(result.current.holesToSubmit).toBe(18);
    });

    it('allows submitting an undecided match once the 18 holes are validated', async () => {
      getScoringViewUseCase.execute.mockResolvedValue({
        ...mockScoringView,
        scores: scoredHoles(18),
      });

      const { result } = renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canSubmitScorecard).toBe(true);
    });

    it('holds back a decided match with a hole only my marker scored', async () => {
      // Hole 7: my marker entered my score from their phone and I never entered
      // mine, so it sits PENDING. Submitting locks my own score for good and
      // the hole drops out of the result, so the card is not ready.
      getScoringViewUseCase.execute.mockResolvedValue({
        ...mockScoringView,
        isDecided: true,
        decidedResult: { winner: 'A', score: '9&7' },
        scores: [
          ...scoredHoles(6),
          {
            holeNumber: 7,
            playerScores: [{
              userId: 'u1',
              ownSubmitted: false,
              markerSubmitted: true,
              validationStatus: 'pending',
            }],
          },
          ...scoredHoles(4, { from: 8 }),
        ],
      });

      const { result } = renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canSubmitScorecard).toBe(false);
    });

    it('does not offer to submit an empty card in a decided match', async () => {
      // Conceded or walked over without scoring: there is no card to sign
      getScoringViewUseCase.execute.mockResolvedValue({
        ...mockScoringView,
        isDecided: true,
        decidedResult: { winner: 'B', score: '3&2' },
        scores: [],
      });

      const { result } = renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canSubmitScorecard).toBe(false);
    });

    it('does not offer to submit twice', async () => {
      getScoringViewUseCase.execute.mockResolvedValue({
        ...mockScoringView,
        isDecided: true,
        decidedResult: { winner: 'A', score: '9&7' },
        scores: scoredHoles(11),
        scorecardSubmittedBy: ['u1'],
      });

      const { result } = renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canSubmitScorecard).toBe(false);
    });
  });

  it('should try to acquire session lock for match players', async () => {
    const { result } = renderHook(() => useScoring('m-1', 'u1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(sessionLock.acquire).toHaveBeenCalled();
  });

  it('should force-release stale locks and acquire on mount', async () => {
    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // forceRelease is called before acquire to clear stale locks
    expect(sessionLock.forceRelease).toHaveBeenCalled();
    expect(sessionLock.acquire).toHaveBeenCalled();
    expect(result.current.isSessionBlocked).toBe(false);
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

  it('should always show 18 holes even when match is decided early', async () => {
    const decidedView = {
      ...mockScoringView,
      isDecided: true,
      decidedResult: { winner: 'A', score: '5&4' },
      matchStanding: { status: '5UP', leadingTeam: 'A', holesPlayed: 14, holesRemaining: 4 },
    };
    getScoringViewUseCase.execute.mockResolvedValue(decidedView);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalHoles).toBe(18);
  });

  it('should release session lock on unmount', async () => {
    const { result, unmount } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    unmount();
    expect(sessionLock.release).toHaveBeenCalled();
  });

  it('should set isOwnScoreLocked when user has submitted', async () => {
    const viewWithSubmit = {
      ...mockScoringView,
      scorecardSubmittedBy: ['u1'],
    };
    getScoringViewUseCase.execute.mockResolvedValue(viewWithSubmit);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isOwnScoreLocked).toBe(true);
    expect(result.current.isMarkerScoreLocked).toBe(false);
  });

  it('should set isMarkerScoreLocked when marked player has submitted', async () => {
    const viewWithMarkedSubmit = {
      ...mockScoringView,
      scorecardSubmittedBy: ['u2'],
    };
    getScoringViewUseCase.execute.mockResolvedValue(viewWithMarkedSubmit);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isOwnScoreLocked).toBe(false);
    expect(result.current.isMarkerScoreLocked).toBe(true);
  });

  it('should allow score submission after own scorecard submitted (marker corrections)', async () => {
    const viewWithOwnSubmit = {
      ...mockScoringView,
      scorecardSubmittedBy: ['u1'],
    };
    getScoringViewUseCase.execute.mockResolvedValue(viewWithOwnSubmit);
    const updatedView = { ...viewWithOwnSubmit, scores: [{ holeNumber: 1 }] };
    submitHoleScoreUseCase.execute.mockResolvedValue(updatedView);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // isOwnScoreLocked=true but isMarkerScoreLocked=false → can still submit
    await act(async () => {
      await result.current.submitScore(1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 5 });
    });

    expect(submitHoleScoreUseCase.execute).toHaveBeenCalled();
  });

  it('should block score submission when both own and marker are locked', async () => {
    const viewBothSubmitted = {
      ...mockScoringView,
      scorecardSubmittedBy: ['u1', 'u2'],
    };
    getScoringViewUseCase.execute.mockResolvedValue(viewBothSubmitted);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.submitScore(1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 5 });
    });

    expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
  });

  it('should be fully locked when both player and marker submitted', async () => {
    const viewBothSubmitted = {
      ...mockScoringView,
      scorecardSubmittedBy: ['u1', 'u2'],
    };
    getScoringViewUseCase.execute.mockResolvedValue(viewBothSubmitted);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isFullyLocked).toBe(true);
    expect(result.current.isOwnScoreLocked).toBe(true);
    expect(result.current.isMarkerScoreLocked).toBe(true);
  });

  it('should NOT be fully locked in FOURBALL when the player I mark has a pending discrepancy, even if the player who marks me already submitted', async () => {
    // Non-reciprocal 4-cycle, matching backend's FOURBALL marker generation:
    // u1(A1)->u2(B1), marked by u4(B2). u2(B1)->u3(A2), marked by u1(A1).
    // u3(A2)->u4(B2), marked by u2(B1). u4(B2)->u1(A1), marked by u3(A2).
    const fourballView = {
      ...mockScoringView,
      matchFormat: 'FOURBALL',
      players: [
        { userId: 'u1', userName: 'A1', team: 'A' },
        { userId: 'u2', userName: 'B1', team: 'B' },
        { userId: 'u3', userName: 'A2', team: 'A' },
        { userId: 'u4', userName: 'B2', team: 'B' },
      ],
      markerAssignments: [
        { scorerUserId: 'u1', marksUserId: 'u2', markedByUserId: 'u4' },
        { scorerUserId: 'u2', marksUserId: 'u3', markedByUserId: 'u1' },
        { scorerUserId: 'u3', marksUserId: 'u4', markedByUserId: 'u2' },
        { scorerUserId: 'u4', marksUserId: 'u1', markedByUserId: 'u3' },
      ],
      // u1 and u4 (who marks u1) already submitted; u2 (whom u1 marks) has not,
      // e.g. blocked by an unresolved discrepancy.
      scorecardSubmittedBy: ['u1', 'u4'],
    };
    getScoringViewUseCase.execute.mockResolvedValue(fourballView);

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isOwnScoreLocked).toBe(true);
    expect(result.current.isMarkerScoreLocked).toBe(false);
    expect(result.current.isFullyLocked).toBe(false);

    // u1 must still be able to correct the marker score for u2 (the discrepancy)
    await act(async () => {
      await result.current.submitScore(1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 5 });
    });
    expect(submitHoleScoreUseCase.execute).toHaveBeenCalled();
  });

  describe('admin bypass', () => {
    it('admin not in match has canScore=true and isMatchPlayer=false', async () => {
      const { result } = renderHook(() => useScoring('m-1', 'u-admin', true));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isMatchPlayer).toBe(false);
      expect(result.current.canScore).toBe(true);
    });

    it('admin can submit hole score even without being in the match', async () => {
      const updatedView = { ...mockScoringView, scores: [{ holeNumber: 1 }] };
      submitHoleScoreUseCase.execute.mockResolvedValue(updatedView);

      const { result } = renderHook(() => useScoring('m-1', 'u-admin', true));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.submitScore(1, { ownScore: 4, markedPlayerId: 'u2', markedScore: 5 });
      });

      expect(submitHoleScoreUseCase.execute).toHaveBeenCalledWith('m-1', 1, {
        ownScore: 4,
        markedPlayerId: 'u2',
        markedScore: 5,
      });
    });

    it('admin does not acquire session lock', async () => {
      sessionLock.acquire.mockClear();

      const { result } = renderHook(() => useScoring('m-1', 'u-admin', true));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(sessionLock.acquire).not.toHaveBeenCalled();
    });

    it('non-admin non-player still cannot score', async () => {
      const { result } = renderHook(() => useScoring('m-1', 'u99', false));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.canScore).toBe(false);

      await act(async () => {
        await result.current.submitScore(1, { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 });
      });

      expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
    });
  });
  describe('vaciar la cola con anotaciones por participante (FE #515)', () => {
    afterEach(() => {
      // `vi.clearAllMocks()` limpia las llamadas pero NO los valores de
      // retorno, y aquí se fija uno: sin esto, el siguiente test que se
      // añadiera detrás montaría el hook con una cola que nunca se vacía
      offlineQueue.getByMatch.mockReturnValue([]);
      offlineQueue.size.mockReturnValue(0);
    });

    it('no envía por aquí una anotación de partida rápida', async () => {
      // Va por otro endpoint y con otro cuerpo: mandarla desde el vaciado de
      // competición la guardaría mal y la borraría a continuación
      offlineQueue.getByMatch.mockReturnValue([
        { matchId: 'm-1', holeNumber: 7, participantId: 'p-1', scoreData: { score: 5 } },
      ]);

      renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(getScoringViewUseCase.execute).toHaveBeenCalled());

      await act(async () => {
        window.dispatchEvent(new globalThis.Event('online'));
        await Promise.resolve();
      });

      expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
      expect(offlineQueue.remove).not.toHaveBeenCalled();
    });

    it('envía y borra las suyas, que no llevan participante', async () => {
      offlineQueue.getByMatch.mockReturnValue([
        { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 } },
      ]);
      submitHoleScoreUseCase.execute.mockResolvedValue({});

      renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(getScoringViewUseCase.execute).toHaveBeenCalled());

      await act(async () => {
        window.dispatchEvent(new globalThis.Event('online'));
        await Promise.resolve();
      });

      await waitFor(() =>
        expect(offlineQueue.remove).toHaveBeenCalledWith('m-1', 7, undefined, null)
      );
    });

    it('descarta la que el servidor rechaza sin vuelta atrás', async () => {
      // Un 4xx no se reintenta: se quita de la cola o se queda ahí para siempre
      offlineQueue.getByMatch.mockReturnValue([
        { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 } },
      ]);
      const rechazo = new Error('Bad request');
      rechazo.status = 400;
      submitHoleScoreUseCase.execute.mockRejectedValue(rechazo);

      renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(getScoringViewUseCase.execute).toHaveBeenCalled());

      await act(async () => {
        window.dispatchEvent(new globalThis.Event('online'));
        await Promise.resolve();
      });

      await waitFor(() =>
        expect(offlineQueue.remove).toHaveBeenCalledWith('m-1', 7, undefined, null)
      );
    });

    it('cuenta solo las anotaciones que este vaciado sabe enviar', async () => {
      // La cola la comparten los dos modos. Contar también las de partida
      // rápida —que aquí no se envían nunca— dejaba el número en algo distinto
      // de cero para siempre
      offlineQueue.getByMatch.mockReturnValue([
        { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 } },
        { matchId: 'm-1', holeNumber: 8, participantId: 'p-1', scoreData: { score: 4 } },
      ]);

      const { result } = renderHook(() => useScoring('m-1', 'u1'));

      await waitFor(() => expect(result.current.pendingQueueSize).toBe(1));
    });
  });
});

describe('useScoring · un móvil compartido (FE #521)', () => {
  // Escenario propio y completo: `clearAllMocks` limpia las llamadas pero NO
  // las implementaciones, así que un bloque que no monta las suyas pasa
  // heredando las del vecino — y falla en cuanto se ejecuta solo, se filtra
  // por nombre o se baraja el orden
  beforeEach(() => {
    vi.clearAllMocks();
    getScoringViewUseCase.execute.mockResolvedValue(mockScoringView);
    submitHoleScoreUseCase.execute.mockResolvedValue(mockScoringView);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('no envía ni borra lo que anotó otra persona', async () => {
    // A anota sin cobertura, caduca su sesión, entra B y abre esa partida.
    // Sin esto, el golpe de A salía con la sesión de B, se escribía en la
    // tarjeta de B y desaparecía de la cola
    offlineQueue.getByMatch.mockImplementation((matchId, userId) =>
      // La cola real ya filtra por dueño: aquí se imita para comprobar que el
      // hook pregunta por lo SUYO y no por todo
      userId === 'u-b' ? [] : [{ matchId, holeNumber: 3, participantId: null, userId: 'u-a', scoreData: { ownScore: 4 } }]
    );

    const { result } = renderHook(() => useScoring('m-1', 'u-b'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    submitHoleScoreUseCase.execute.mockClear();
    await act(async () => {
      window.dispatchEvent(new globalThis.Event('online'));
    });

    expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
    expect(offlineQueue.remove).not.toHaveBeenCalled();
  });

  it('pide su cola con su propio identificador', async () => {
    offlineQueue.getByMatch.mockReturnValue([]);

    const { result } = renderHook(() => useScoring('m-1', 'u-b'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(offlineQueue.getByMatch).toHaveBeenCalledWith('m-1', 'u-b');
  });
});

describe('useScoring · lo que no se puede perder en silencio (FE #521)', () => {
  // Igual que arriba: escenario propio, sin heredar implementaciones de nadie
  beforeEach(() => {
    vi.clearAllMocks();
    getScoringViewUseCase.execute.mockResolvedValue(mockScoringView);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    offlineQueue.getByMatch.mockReturnValue([]);
    offlineQueue.enqueue.mockReturnValue(true);
  });

  const anotaCon = async (error) => {
    submitHoleScoreUseCase.execute.mockRejectedValueOnce(error);
    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.submitScore(1, { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 });
    });
    return result;
  };

  it.each([401, 408, 429])('un %s guarda el golpe en vez de tirarlo', async (codigo) => {
    // Antes solo se guardaba a partir del 500, así que una sesión caducada
    // —lo normal al volver tras un rato— tiraba la anotación
    await anotaCon(Object.assign(new Error('x'), { status: codigo }));

    expect(offlineQueue.enqueue).toHaveBeenCalled();
  });

  it('si el móvil no puede guardarlo, se dice', async () => {
    // Sin espacio o en ventana privada. Callarlo deja al jugador creyendo que
    // su golpe está a salvo en algún sitio, y no está en ninguno
    offlineQueue.enqueue.mockReturnValue(false);

    const result = await anotaCon(new TypeError('Failed to fetch'));

    expect(result.current.error).toBeTruthy();
    expect(result.current.error.noSeGuardo).toBe(true);
  });
});

describe('useScoring · el aviso dice la verdad (FE #521)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getScoringViewUseCase.execute.mockResolvedValue(mockScoringView);
    submitHoleScoreUseCase.execute.mockResolvedValue(mockScoringView);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    offlineQueue.getByMatch.mockReturnValue([]);
    offlineQueue.enqueue.mockReturnValue(true);
  });

  const anota = async (result, hole) => {
    await act(async () => {
      await result.current.submitScore(hole, { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 });
    });
  };

  it('un golpe encolado no se enseña como fallo', async () => {
    // Se guardó: para el jugador está anotado, solo que no ha salido del móvil.
    // Decirle que ha fallado es lo que le hace anotarlo dos veces
    submitHoleScoreUseCase.execute.mockRejectedValueOnce(
      Object.assign(new Error('sesión'), { status: 401 })
    );
    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await anota(result, 1);

    expect(offlineQueue.enqueue).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('el aviso de «no se pudo guardar» se retira en cuanto uno sí se guarda', async () => {
    // Sin cobertura no hay sondeo que limpie nada, así que sin esto el cartel
    // del hoyo 1 se quedaba puesto el resto de la vuelta mientras los demás
    // hoyos se guardaban perfectamente
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    offlineQueue.enqueue.mockReturnValueOnce(false);
    await anota(result, 1);
    expect(result.current.error?.noSeGuardo).toBe(true);

    offlineQueue.enqueue.mockReturnValue(true);
    await anota(result, 2);

    expect(result.current.error).toBeNull();
  });
});
