import { describe, it, expect, vi, beforeEach } from 'vitest';

// Este entorno no trae `localStorage`, y el aviso de «no se pudo guardar» vive
// ahí. Se define arriba del todo: dentro de un `beforeEach` los módulos ya
// importados leerían otro objeto
const almacen = (() => {
  let datos = {};
  return {
    getItem: (clave) => datos[clave] ?? null,
    setItem: (clave, valor) => { datos[clave] = String(valor); },
    removeItem: (clave) => { delete datos[clave]; },
    clear: () => { datos = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: almacen, writable: true });
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
  // Devuelve `true` como el de verdad: con `undefined`, el vaciado creía que
  // no había podido borrar y cortaba tras el primer envío, así que la mitad de
  // las ramas de estos tests no se ejecutaba nunca
  remove: vi.fn(() => true),
  clear: vi.fn(),
  size: vi.fn(() => 0),
  getByMatch: vi.fn(() => []),
  ponleNombre: vi.fn(() => true),
  marcaDesaparecida: vi.fn(() => true),
  olvidaLasDe: vi.fn(() => true),
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
import * as golpesPerdidos from '../utils/golpesPerdidos';
import * as offlineQueue from '../utils/scoringOfflineQueue';
import * as sessionLock from '../utils/scoringSessionLock';
import * as motor from '../services/vaciaAnotaciones';

// El motor de verdad, pero espiado: cuántas PASADAS da un disparador es lo
// que se quiere vigilar, y por el número de envíos no se distingue
vi.mock('../services/vaciaAnotaciones', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, vaciaAnotaciones: vi.fn(real.vaciaAnotaciones) };
});

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
    vi.restoreAllMocks();
    vi.clearAllMocks();
    almacen.clear();
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
      { matchName: null, matchNumber: 1 },
    );
    expect(submitHoleScoreUseCase.execute).not.toHaveBeenCalled();
  });

  it('guarda campo y número, para que el aviso diga de qué partida es', async () => {
    // Sin él, quien vuelve a casa con golpes sin enviar de tres partidas ve
    // tres avisos idénticos y no sabe cuál mirar (FE #521)
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    getScoringViewUseCase.execute.mockResolvedValue({
      ...mockScoringView,
      matchNumber: 3,
      roundInfo: { golfCourseName: 'La Herrería' },
    });

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.submitScore(1, { ownScore: 5, markedPlayerId: 'u2', markedScore: 4 });
    });

    expect(offlineQueue.enqueue).toHaveBeenCalledWith(
      'm-1',
      1,
      expect.anything(),
      null,
      'u1',
      // El número TAMBIÉN: una jornada juega varios partidos en el mismo campo,
      // y solo con el campo el panel enseña dos avisos idénticos
      { matchName: 'La Herrería', matchNumber: 3 },
    );
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

    it('vacía AL ENTRAR, aunque ya hubiera cobertura', async () => {
      // Quien llega aquí desde el aviso del panel —«tienes 3 golpes sin
      // enviar»— ya está conectado, así que `online` no se dispara nunca. Sin
      // esto, seguir la instrucción de ese aviso no enviaba nada, y encima el
      // vaciado de fondo dejaba esta partida fuera por estar abierta
      offlineQueue.getByMatch.mockReturnValue([
        { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1' },
      ]);
      submitHoleScoreUseCase.execute.mockResolvedValue({});

      renderHook(() => useScoring('m-1', 'u1'));

      await waitFor(() =>
        expect(submitHoleScoreUseCase.execute).toHaveBeenCalledWith('m-1', 7, { ownScore: 5 })
      );
    });

    it('y al volver a la aplicación, que en iOS es lo único que llega', async () => {
      // Una página suspendida no recibe `online`. La pantalla de partida
      // rápida ya lo escuchaba; esta era su gemela sin arreglar
      offlineQueue.getByMatch.mockReturnValue([
        { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1' },
      ]);
      submitHoleScoreUseCase.execute.mockResolvedValue({});
      renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalled());
      submitHoleScoreUseCase.execute.mockClear();

      await act(async () => {
        document.dispatchEvent(new globalThis.Event('visibilitychange'));
        await Promise.resolve();
      });

      await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalled());
    });

    it('reanotar el hoyo retira su aviso de perdido', async () => {
      // El aviso pide repetirlo, y eso es lo que se acaba de hacer. Sin esto,
      // el panel seguía pidiendo repetir un hoyo ya anotado, y la única salida
      // era «Entendido», que borra TODOS los de esa partida
      golpesPerdidos.apunta({ matchId: 'm-1', matchName: 'Meis', holeNumber: 7, userId: 'u1' });
      golpesPerdidos.apunta({ matchId: 'm-1', matchName: 'Meis', holeNumber: 9, userId: 'u1' });
      submitHoleScoreUseCase.execute.mockResolvedValue(mockScoringView);

      const { result } = renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.submitScore(7, { ownScore: 4, markedPlayerId: 'u2', markedScore: 5 });
      });

      // Solo el suyo: el hoyo 9 sigue perdido y hay que seguir diciéndolo
      expect(golpesPerdidos.pendientes('u1')).toEqual([
        expect.objectContaining({ holeNumber: 9 }),
      ]);
    });

    it('pero si el reemplazo tampoco se puede guardar, el aviso SIGUE', async () => {
      // Retirarlo antes de saberlo dejaba al jugador sin golpe y sin aviso:
      // ni en la tarjeta, ni en la cola, ni en el panel
      golpesPerdidos.apunta({ matchId: 'm-1', matchName: 'Meis', holeNumber: 7, userId: 'u1' });
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      offlineQueue.enqueue.mockReturnValue(false);

      const { result } = renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.submitScore(7, { ownScore: 4, markedPlayerId: 'u2', markedScore: 5 });
      });

      expect(golpesPerdidos.pendientes('u1')).toHaveLength(1);
      expect(result.current.error).toBeTruthy();
    });

    it('ni cuando el servidor rechaza el reemplazo para siempre', async () => {
      golpesPerdidos.apunta({ matchId: 'm-1', matchName: 'Meis', holeNumber: 7, userId: 'u1' });
      submitHoleScoreUseCase.execute.mockRejectedValue(
        Object.assign(new Error('Match completed'), { status: 409 })
      );

      const { result } = renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await result.current.submitScore(7, { ownScore: 4, markedPlayerId: 'u2', markedScore: 5 });
      });

      expect(golpesPerdidos.pendientes('u1')).toHaveLength(1);
    });

    it('la que el servidor rechaza se descarta DEJANDO AVISO, no en silencio', async () => {
      // Un 4xx no se reintenta. Pero quitarla y callar hace desaparecer un
      // golpe sin que su dueño se entere, que es la mitad de la FE #521: aquí
      // se borraba en silencio mientras el vaciado de fondo, con el mismo 409,
      // sí dejaba constancia
      offlineQueue.getByMatch.mockReturnValue([
        { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1',
          matchName: 'La Herrería', matchNumber: 3 },
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
        expect(offlineQueue.remove).toHaveBeenCalledWith('m-1', 7, undefined, 'u1')
      );
      expect(golpesPerdidos.pendientes('u1')).toEqual([
        expect.objectContaining({ matchId: 'm-1', holeNumber: 7, matchName: 'La Herrería' }),
      ]);
    });

    it('y si el aviso no se puede escribir, el golpe NO se borra', async () => {
      // Preferible reintentarlo mil veces a que desaparezca sin dejar rastro
      offlineQueue.getByMatch.mockReturnValue([
        { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1' },
      ]);
      submitHoleScoreUseCase.execute.mockRejectedValue(
        Object.assign(new Error('Bad request'), { status: 400 })
      );
      vi.spyOn(almacen, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(getScoringViewUseCase.execute).toHaveBeenCalled());

      await act(async () => {
        window.dispatchEvent(new globalThis.Event('online'));
        await Promise.resolve();
      });

      await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalled());
      expect(offlineQueue.remove).not.toHaveBeenCalled();
    });

    it('un error de UNA anotación no deja sin enviar los demás hoyos', async () => {
      // El caso de uso valida antes de enviar y lanza un Error pelado. Parar
      // por él dejaba el resto de la partida sin salir en cada reconexión
      offlineQueue.getByMatch.mockReturnValue([
        { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1' },
        { matchId: 'm-1', holeNumber: 8, scoreData: { ownScore: 4 }, userId: 'u1' },
      ]);
      submitHoleScoreUseCase.execute
        .mockRejectedValueOnce(new Error('Marked player ID is required'))
        .mockResolvedValue({});

      renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(getScoringViewUseCase.execute).toHaveBeenCalled());

      await act(async () => {
        window.dispatchEvent(new globalThis.Event('online'));
        await Promise.resolve();
      });

      // Lo que importa es que la SEGUNDA se intenta pese a que la primera
      // falló, no cuántas vueltas de vaciado haya dado (aquí la cola está
      // mockeada y no se vacía, así que se repiten)
      await waitFor(() =>
        expect(submitHoleScoreUseCase.execute.mock.calls.map((c) => c[1])).toContain(8)
      );
      // El 8 se intenta INMEDIATAMENTE después del 7 que falló, en la misma
      // vuelta: eso es lo que antes no pasaba, porque se salía con un `break`
      expect(submitHoleScoreUseCase.execute.mock.calls.slice(0, 2).map((c) => c[1]))
        .toEqual([7, 8]);
      expect(offlineQueue.remove).toHaveBeenCalledWith('m-1', 8, undefined, 'u1');
    });

    it('pero un fallo de sesión sí para el vaciado entero', async () => {
      // `api.js` responde a un 403 de CSRF cerrando la sesión y redirigiendo:
      // insistir con el resto es repetir ese cierre una vez por golpe
      offlineQueue.getByMatch.mockReturnValue([
        { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1' },
        { matchId: 'm-1', holeNumber: 8, scoreData: { ownScore: 4 }, userId: 'u1' },
      ]);
      submitHoleScoreUseCase.execute.mockRejectedValue(
        Object.assign(new Error('CSRF validation failed. Please log in again.'), {
          errorCode: 'CSRF_VALIDATION_FAILED',
        })
      );

      renderHook(() => useScoring('m-1', 'u1'));
      await waitFor(() => expect(getScoringViewUseCase.execute).toHaveBeenCalled());

      await act(async () => {
        window.dispatchEvent(new globalThis.Event('online'));
        await Promise.resolve();
      });

      // Una sola por vuelta de vaciado: no se insiste con la segunda
      await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalled());
      expect(submitHoleScoreUseCase.execute.mock.calls.map((c) => c[1])).not.toContain(8);
      expect(offlineQueue.remove).not.toHaveBeenCalled();
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

describe('useScoring · cuando el vaciado se para, y lo que se nombra (FE #551)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getScoringViewUseCase.execute.mockResolvedValue(mockScoringView);
    submitHoleScoreUseCase.execute.mockResolvedValue({});
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    offlineQueue.getByMatch.mockReturnValue([]);
    offlineQueue.remove.mockReturnValue(true);
  });

  const vuelveLaRed = async () => {
    await act(async () => {
      window.dispatchEvent(new globalThis.Event('online'));
      await Promise.resolve();
    });
  };

  it('si no se pudo borrar, el aviso queda puesto AUNQUE la vista se vuelva a pedir', async () => {
    // Antes iba en `error`, que la propia recarga y cada sondeo dejan a null:
    // el aviso vivía menos de un render y nadie lo llegó a ver
    offlineQueue.getByMatch.mockReturnValue([
      { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1' },
    ]);
    offlineQueue.remove.mockReturnValue(false);
    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const vecesAntes = getScoringViewUseCase.execute.mock.calls.length;

    await vuelveLaRed();

    await waitFor(() => expect(result.current.avisoDelVaciado).toBe('no-se-pudo-borrar'));
    // La vista se volvió a pedir después, y el aviso sigue
    await waitFor(() =>
      expect(getScoringViewUseCase.execute.mock.calls.length).toBeGreaterThan(vecesAntes)
    );
    expect(result.current.avisoDelVaciado).toBe('no-se-pudo-borrar');
    expect(result.current.error).toBeNull();

    // Y se quita solo cuando otro vaciado termina sin ese paro
    offlineQueue.remove.mockReturnValue(true);
    await vuelveLaRed();
    await waitFor(() => expect(result.current.avisoDelVaciado).toBeNull());
  });

  it('un paro por red o servidor no deja aviso: se arregla esperando', async () => {
    offlineQueue.getByMatch.mockReturnValue([
      { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1' },
    ]);
    submitHoleScoreUseCase.execute.mockRejectedValue(
      Object.assign(new Error('HTTP 503'), { status: 503 })
    );
    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await vuelveLaRed();

    await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalled());
    expect(result.current.avisoDelVaciado).toBeNull();
  });

  it('el aviso puesto sobrevive a una pasada que para por la red', async () => {
    // Esa pasada no ha tocado el disco: quitarlo por una caída de red dejaba
    // al jugador sin saber que su móvil no guarda mientras la entrada seguía
    offlineQueue.getByMatch.mockReturnValue([
      { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1' },
    ]);
    offlineQueue.remove.mockReturnValue(false);
    // El vaciado de entrar ya lo pone
    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.avisoDelVaciado).toBe('no-se-pudo-borrar'));

    submitHoleScoreUseCase.execute.mockRejectedValue(
      Object.assign(new Error('HTTP 503'), { status: 503 })
    );
    await vuelveLaRed();
    await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(2));
    expect(result.current.avisoDelVaciado).toBe('no-se-pudo-borrar');
  });

  it('lo corregido MIENTRAS iba la pasada sale en la misma vuelta', async () => {
    // El bucle no manda un valor que no leyó al empezar: sin una pasada más,
    // la corrección esperaba al siguiente disparador, que puede no llegar
    const enCola = [{ matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1' }];
    offlineQueue.getByMatch.mockImplementation(() => enCola.map((e) => ({ ...e })));
    submitHoleScoreUseCase.execute.mockImplementationOnce(async () => {
      // El jugador corrige el 5 por un 6 con la petición en vuelo
      enCola[0] = { ...enCola[0], scoreData: { ownScore: 6 } };
      return {};
    });
    // El vaciado de entrar es el que lo manda
    renderHook(() => useScoring('m-1', 'u1'));

    await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(2));
    expect(submitHoleScoreUseCase.execute.mock.calls.map((c) => c[2])).toEqual([
      { ownScore: 5 },
      { ownScore: 6 },
    ]);
    // Y la segunda pasada no hace una tercera: no es un bucle
    await new Promise((r) => setTimeout(r, 20));
    expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('sin corrección no hay pasada de más', async () => {
    // Sin corrección no hay nada que releer: cada disparador haría dos
    // lecturas de la cola por una
    offlineQueue.getByMatch.mockReturnValue([
      { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1' },
    ]);
    renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(motor.vaciaAnotaciones).toHaveBeenCalledTimes(1);
  });

  it('con corrección pero parado por el disco, no se insiste: es el mismo disco', async () => {
    // El 7 se corrige en vuelo (no se toca el disco por él); el 9 llega y no
    // se puede borrar: paro. La corrección del 7 espera al siguiente disparador
    const enCola = [
      { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 }, userId: 'u1' },
      { matchId: 'm-1', holeNumber: 9, scoreData: { ownScore: 4 }, userId: 'u1' },
    ];
    offlineQueue.getByMatch.mockImplementation(() => enCola.map((e) => ({ ...e })));
    offlineQueue.remove.mockReturnValue(false);
    submitHoleScoreUseCase.execute.mockImplementationOnce(async () => {
      enCola[0] = { ...enCola[0], scoreData: { ownScore: 6 } };
      return {};
    });
    const { result } = renderHook(() => useScoring('m-1', 'u1'));

    await waitFor(() => expect(result.current.avisoDelVaciado).toBe('no-se-pudo-borrar'));
    await new Promise((r) => setTimeout(r, 20));
    expect(submitHoleScoreUseCase.execute.mock.calls.map((c) => [c[1], c[2]])).toEqual([
      [7, { ownScore: 5 }],
      [9, { ownScore: 4 }],
    ]);
    expect(motor.vaciaAnotaciones).toHaveBeenCalledTimes(1);
  });

  it('el aviso de una anotación huérfana queda a nombre de quien la rescató', async () => {
    // Sin dueño lo ve toda cuenta del móvil, y el primero que pulse
    // «Entendido» se lo lleva antes de que lo vea el suyo
    offlineQueue.getByMatch.mockReturnValue([
      { matchId: 'm-1', holeNumber: 7, scoreData: { ownScore: 5 } },
    ]);
    submitHoleScoreUseCase.execute.mockRejectedValue(
      Object.assign(new Error('Conflict'), { status: 409 })
    );
    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await vuelveLaRed();

    await waitFor(() =>
      expect(golpesPerdidos.pendientes('u1')).toEqual([
        expect.objectContaining({ matchId: 'm-1', holeNumber: 7, userId: 'u1' }),
      ])
    );
    expect(golpesPerdidos.pendientes('otra')).toEqual([]);
  });

  it('pone nombre también a los avisos ya apartados, no solo a la cola', async () => {
    golpesPerdidos.apunta({ matchId: 'm-1', matchName: null, matchNumber: null, holeNumber: 7, userId: 'u1' });
    getScoringViewUseCase.execute.mockResolvedValue({
      ...mockScoringView,
      roundInfo: { golfCourseName: 'Meis' },
    });

    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(offlineQueue.ponleNombre).toHaveBeenCalledWith('m-1', { matchName: 'Meis', matchNumber: 1 });
    expect(golpesPerdidos.pendientes('u1')).toEqual([
      expect.objectContaining({ holeNumber: 7, matchName: 'Meis', matchNumber: 1 }),
    ]);
  });

  it('no pone a la partida nueva el nombre de la que se acaba de dejar', async () => {
    // La vista no se vacía al cambiar de partida: hay un render con el
    // `matchId` de B y la vista de A
    getScoringViewUseCase.execute.mockResolvedValue({
      ...mockScoringView,
      roundInfo: { golfCourseName: 'Meis' },
    });
    const { result, rerender } = renderHook(({ id }) => useScoring(id, 'u1'), {
      initialProps: { id: 'm-1' },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    offlineQueue.ponleNombre.mockClear();
    getScoringViewUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));

    rerender({ id: 'm-2' });

    await waitFor(() => expect(getScoringViewUseCase.execute).toHaveBeenCalledWith('m-2'));
    expect(offlineQueue.ponleNombre).not.toHaveBeenCalledWith('m-2', expect.anything());
  });

  it('los avisos del cerrojo del vaciado de fondo no le dicen nada a esta pantalla', async () => {
    // El mismo usuario tiene ahora dos cerrojos: el de anotar y el del
    // vaciado, con ámbito. Cuando el vaciado suelta el suyo, esta pantalla no
    // tiene que volver a pedir el de anotar
    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const escucha = sessionLock.onLockEvent.mock.calls.at(-1)[0];
    sessionLock.acquire.mockClear();

    act(() => {
      escucha({ type: 'LOCK_RELEASED', sessionId: 'vaciado-1', userId: 'u1', scope: 'vaciado' });
    });
    expect(sessionLock.acquire).not.toHaveBeenCalled();

    // El del propio ámbito de anotar sí se atiende
    act(() => {
      escucha({ type: 'LOCK_RELEASED', sessionId: 'otra-pestaña', userId: 'u1', scope: '' });
    });
    expect(sessionLock.acquire).toHaveBeenCalledWith('m-1', expect.any(String), 'u1');
  });
});
