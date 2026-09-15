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

describe('useScoring · se guarda ANTES de enviar (FE #601)', () => {
  // Una cola que se comporta como la de verdad —reemplaza, sella y borra— para
  // poder mirar qué hay guardado en cada momento del envío. El reloj avanza
  // uno por anotación salvo que se fije: dos anotaciones en el mismo
  // milisegundo son un caso real (lo cazó el CI en partida rápida)
  let enCola;
  let reloj;
  let relojFijo;

  const esLaMisma = (e, matchId, holeNumber, participantId, userId) =>
    e.matchId === matchId
    && e.holeNumber === holeNumber
    && (e.participantId ?? null) === (participantId ?? null)
    && (e.userId ?? null) === (userId ?? null);

  const golpe = (ownScore) => ({ ownScore, markedPlayerId: 'u2', markedScore: 4 });
  const guardadaDe = (holeNumber, scoreData, timestamp = 1) =>
    ({ matchId: 'm-1', holeNumber, participantId: null, scoreData, timestamp, userId: 'u1' });

  const enVuelo = () => {
    let suelta;
    let falla;
    const promesa = new Promise((resolve, reject) => { suelta = resolve; falla = reject; });
    return { promesa, suelta, falla };
  };

  const esperaUnPoco = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

  // Montada y con el vaciado de entrar ya terminado, que con la cola vacía no
  // manda nada pero sí tiene el cerrojo un momento
  const monta = async () => {
    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await esperaUnPoco();
    return result;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    almacen.clear();
    enCola = [];
    reloj = 1000;
    relojFijo = false;
    getScoringViewUseCase.execute.mockResolvedValue(mockScoringView);
    submitHoleScoreUseCase.execute.mockResolvedValue(mockScoringView);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    offlineQueue.enqueue.mockImplementation((matchId, holeNumber, scoreData, participantId = null, userId = null) => {
      enCola = enCola.filter((e) => !esLaMisma(e, matchId, holeNumber, participantId, userId));
      enCola.push({ matchId, holeNumber, participantId, scoreData, timestamp: relojFijo ? reloj : reloj++, userId });
      return true;
    });
    offlineQueue.getByMatch.mockImplementation((matchId) =>
      enCola.filter((e) => e.matchId === matchId).map((e) => ({ ...e }))
    );
    offlineQueue.remove.mockImplementation((matchId, holeNumber, participantId = null, userId = null) => {
      enCola = enCola.filter((e) => !esLaMisma(e, matchId, holeNumber, participantId, userId));
      return true;
    });
  });

  afterEach(() => {
    // Las implementaciones sobreviven a `clearAllMocks`: sin esto, cualquier
    // bloque que se añada detrás heredaría esta cola
    offlineQueue.enqueue.mockReset();
    offlineQueue.getByMatch.mockReset().mockReturnValue([]);
    offlineQueue.remove.mockReset().mockReturnValue(true);
    submitHoleScoreUseCase.execute.mockReset();
  });

  it('1 · el golpe ya está en la cola cuando sale la petición, y al llegar no queda nada', async () => {
    const result = await monta();
    let loGuardadoAlEnviar = null;
    submitHoleScoreUseCase.execute.mockImplementationOnce(async () => {
      loGuardadoAlEnviar = enCola.map((e) => [e.holeNumber, e.scoreData]);
      return mockScoringView;
    });

    await act(async () => { await result.current.submitScore(5, golpe(5)); });

    expect(loGuardadoAlEnviar).toEqual([[5, golpe(5)]]);
    expect(enCola).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.pendingQueueSize).toBe(0);
  });

  it('2 · si la aplicación muere con la petición muriendo, el golpe está a salvo', async () => {
    const result = await monta();
    const vuelo = enVuelo();
    submitHoleScoreUseCase.execute.mockReturnValueOnce(vuelo.promesa);

    let envio;
    act(() => { envio = result.current.submitScore(5, golpe(5)); });
    await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1));

    // Lo que hay aquí es lo único que sobrevive a cerrar la aplicación
    expect(enCola).toEqual([expect.objectContaining({ holeNumber: 5, userId: 'u1', scoreData: golpe(5) })]);

    await act(async () => { vuelo.falla(new TypeError('Failed to fetch')); await envio; });
  });

  it.each([
    ['sin respuesta', new TypeError('Failed to fetch')],
    ['con un 503', Object.assign(new Error('HTTP 503'), { status: 503 })],
  ])('3 · %s se queda guardado una sola vez, y sin error', async (_, fallo) => {
    const result = await monta();
    submitHoleScoreUseCase.execute.mockRejectedValueOnce(fallo);

    await act(async () => { await result.current.submitScore(5, golpe(5)); });

    expect(offlineQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(enCola).toEqual([expect.objectContaining({ holeNumber: 5, scoreData: golpe(5) })]);
    expect(result.current.error).toBeNull();
    expect(result.current.pendingQueueSize).toBe(1);
  });

  it('4 · un rechazo definitivo sale de la cola y queda apuntado como perdido', async () => {
    // Guardado antes de enviar, un rechazo que no lo sacara lo reenviaría en
    // cada vaciado; y sacarlo sin apuntarlo lo haría desaparecer en cuanto la
    // siguiente anotación buena retire el error (FE #521)
    const result = await monta();
    submitHoleScoreUseCase.execute.mockRejectedValueOnce(
      Object.assign(new Error('Match completed'), { status: 409 })
    );

    await act(async () => { await result.current.submitScore(5, golpe(5)); });

    expect(enCola).toEqual([]);
    expect(golpesPerdidos.pendientes('u1')).toEqual([
      expect.objectContaining({ matchId: 'm-1', holeNumber: 5, userId: 'u1' }),
    ]);
    expect(result.current.error).toBeTruthy();
  });

  it('5 · pero si el jugador lo corrigió con el rechazo en camino, no se aparta', async () => {
    const result = await monta();
    submitHoleScoreUseCase.execute.mockImplementationOnce(async () => {
      offlineQueue.enqueue('m-1', 5, golpe(6), null, 'u1');
      throw Object.assign(new Error('Conflict'), { status: 409 });
    });

    await act(async () => { await result.current.submitScore(5, golpe(5)); });

    expect(enCola).toEqual([expect.objectContaining({ holeNumber: 5, scoreData: golpe(6) })]);
    expect(golpesPerdidos.pendientes('u1')).toEqual([]);
  });

  it('6 · con el móvil lleno, si el envío llega no hay nada que avisar', async () => {
    const result = await monta();
    offlineQueue.enqueue.mockReturnValueOnce(false);

    await act(async () => { await result.current.submitScore(5, golpe(5)); });

    expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  describe('con el móvil lleno y una anotación VIEJA de ese hoyo en la cola', () => {
    // Sin poder guardar, lo que hay en la cola no es este golpe sino uno
    // anterior. Tomarle la hora a ese lo confundía con lo recién enviado
    const montaConLaVieja = async () => {
      const result = await monta();
      enCola = [guardadaDe(5, golpe(4))];
      offlineQueue.enqueue.mockReturnValueOnce(false);
      return result;
    };

    it('6b · si el envío llega, la vieja sale: el siguiente vaciado pisaría la corrección', async () => {
      const result = await montaConLaVieja();

      await act(async () => { await result.current.submitScore(5, golpe(5)); });

      expect(enCola).toEqual([]);
    });

    it('4b · si lo rechazan, queda apuntado como perdido y la vieja no se reenvía', async () => {
      const result = await montaConLaVieja();
      submitHoleScoreUseCase.execute.mockRejectedValueOnce(
        Object.assign(new Error('Match completed'), { status: 409 })
      );

      await act(async () => { await result.current.submitScore(5, golpe(5)); });

      expect(enCola).toEqual([]);
      expect(golpesPerdidos.pendientes('u1')).toEqual([
        expect.objectContaining({ matchId: 'm-1', holeNumber: 5, userId: 'u1' }),
      ]);
    });
  });

  // Fila 7 (móvil lleno y sin respuesta): «si el móvil no puede guardarlo, se
  // dice», más arriba. Fila 12 (modo avión): «should queue score when offline»

  it.each([
    ['8 · corregir el hoyo con el envío en vuelo', false],
    ['9 · lo mismo en el mismo milisegundo, donde el empate lo decide el valor', true],
  ])('%s: la corrección se guarda sin enviar, no se borra, y sale al llegar', async (_, mismoMilisegundo) => {
    const result = await monta();
    relojFijo = mismoMilisegundo;
    const vuelo = enVuelo();
    submitHoleScoreUseCase.execute.mockReturnValueOnce(vuelo.promesa);

    let primero;
    act(() => { primero = result.current.submitScore(5, golpe(5)); });
    await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1));

    await act(async () => { await result.current.submitScore(5, golpe(6)); });
    // Dos peticiones a la vez las decidiría el orden de llegada
    expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);

    await act(async () => { vuelo.suelta(mockScoringView); await primero; });

    await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(2));
    expect(submitHoleScoreUseCase.execute.mock.calls[1]).toEqual(['m-1', 5, golpe(6)]);
    await waitFor(() => expect(enCola).toEqual([]));
  });

  it('10 · anotar con un vaciado enviando solo guarda, y sale al terminar ese vaciado', async () => {
    // El 8 no estaba en la lista de ese vaciado: su pasada de repaso solo
    // relee lo que leyó, así que sin relanzar esperaría al siguiente disparador
    enCola = [guardadaDe(3, golpe(4))];
    const vaciado = enVuelo();
    submitHoleScoreUseCase.execute.mockReturnValueOnce(vaciado.promesa);
    const { result } = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalledWith('m-1', 3, golpe(4)));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.submitScore(8, golpe(5)); });

    expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);
    expect(enCola.map((e) => e.holeNumber)).toEqual([3, 8]);

    await act(async () => { vaciado.suelta({}); });

    await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalledWith('m-1', 8, golpe(5)));
    await waitFor(() => expect(enCola).toEqual([]));
  });

  describe('11 · un vaciado que salta con un envío en vuelo', () => {
    const arrancaElEnvioYVuelveLaRed = async (result) => {
      const vuelo = enVuelo();
      submitHoleScoreUseCase.execute.mockReturnValueOnce(vuelo.promesa);
      let envio;
      act(() => { envio = result.current.submitScore(5, golpe(5)); });
      await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1));
      // Un hoyo de antes, guardado sin cobertura
      enCola.unshift(guardadaDe(3, golpe(4)));

      await act(async () => {
        window.dispatchEvent(new globalThis.Event('online'));
        await Promise.resolve();
      });
      return { vuelo, envio };
    };

    it('no arranca, y lo que aplazó sale en cuanto llega el envío', async () => {
      const result = await monta();
      const { vuelo, envio } = await arrancaElEnvioYVuelveLaRed(result);

      expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);

      await act(async () => { vuelo.suelta(mockScoringView); await envio; });

      await waitFor(() => expect(submitHoleScoreUseCase.execute).toHaveBeenCalledWith('m-1', 3, golpe(4)));
      expect(submitHoleScoreUseCase.execute.mock.calls.filter((c) => c[1] === 5)).toHaveLength(1);
      await waitFor(() => expect(enCola).toEqual([]));
    });

    it('y si el envío no llega por la red, no se relanza: ya lo harán `online` y volver a la app', async () => {
      const result = await monta();
      const { vuelo, envio } = await arrancaElEnvioYVuelveLaRed(result);

      await act(async () => { vuelo.falla(new TypeError('Failed to fetch')); await envio; });
      await esperaUnPoco();

      expect(submitHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);
      expect(enCola.map((e) => e.holeNumber).sort()).toEqual([3, 5]);
    });
  });
});

describe('useScoring · lo que se ve junta el servidor y la cola (FE #606)', () => {
  // La misma cola de verdad en miniatura que el bloque de la #601
  let enCola;
  let reloj;

  const esLaMisma = (e, matchId, holeNumber, participantId, userId) =>
    e.matchId === matchId
    && e.holeNumber === holeNumber
    && (e.participantId ?? null) === (participantId ?? null)
    && (e.userId ?? null) === (userId ?? null);

  const guardada = (holeNumber, scoreData, timestamp = 1) =>
    ({ matchId: 'm-1', holeNumber, participantId: null, scoreData, timestamp, userId: 'u1' });
  const fila = (userId, campos = {}) => ({
    userId, ownScore: null, ownSubmitted: false, markerScore: null, markerSubmitted: false,
    validationStatus: 'pending', netScore: null, ...campos,
  });
  const hoyo = (holeNumber, playerScores) => ({ holeNumber, playerScores });
  const vistaCon = (scores) => ({ ...mockScoringView, scores });
  const visible = (result, holeNumber, userId) =>
    result.current.scoresVisibles
      .find((s) => s.holeNumber === holeNumber)
      ?.playerScores.find((p) => p.userId === userId);

  const enVuelo = () => {
    let suelta;
    const promesa = new Promise((resolve) => { suelta = resolve; });
    return { promesa, suelta };
  };

  const monta = async () => {
    const app = renderHook(() => useScoring('m-1', 'u1'));
    await waitFor(() => expect(app.result.current.isLoading).toBe(false));
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    return app;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    almacen.clear();
    enCola = [];
    reloj = 1000;
    getScoringViewUseCase.execute.mockResolvedValue(vistaCon([]));
    submitHoleScoreUseCase.execute.mockResolvedValue(vistaCon([]));
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    offlineQueue.enqueue.mockImplementation((matchId, holeNumber, scoreData, participantId = null, userId = null) => {
      enCola = enCola.filter((e) => !esLaMisma(e, matchId, holeNumber, participantId, userId));
      enCola.push({ matchId, holeNumber, participantId, scoreData, timestamp: reloj++, userId });
      return true;
    });
    offlineQueue.getByMatch.mockImplementation((matchId) =>
      enCola.filter((e) => e.matchId === matchId).map((e) => ({ ...e }))
    );
    offlineQueue.remove.mockImplementation((matchId, holeNumber, participantId = null, userId = null) => {
      enCola = enCola.filter((e) => !esLaMisma(e, matchId, holeNumber, participantId, userId));
      return true;
    });
  });

  afterEach(() => {
    offlineQueue.enqueue.mockReset();
    offlineQueue.getByMatch.mockReset().mockReturnValue([]);
    offlineQueue.remove.mockReset().mockReturnValue(true);
    submitHoleScoreUseCase.execute.mockReset();
    getScoringViewUseCase.execute.mockReset();
  });

  it('Q1 · el golpe en vuelo ya se ve, y sigue viéndose al reabrir la app', async () => {
    const app = await monta();
    submitHoleScoreUseCase.execute.mockReturnValue(new Promise(() => {}));

    act(() => { app.result.current.submitScore(5, { ownScore: 5, markedPlayerId: 'u2' }); });

    await waitFor(() =>
      expect(visible(app.result, 5, 'u1')).toEqual(expect.objectContaining({ ownScore: 5, ownSubmitted: true }))
    );
    // El servidor no lo tiene: lo que se ve sale de la cola
    expect(app.result.current.scoringView.scores).toEqual([]);

    app.unmount();
    const reabierta = await monta();
    expect(visible(reabierta.result, 5, 'u1')).toEqual(expect.objectContaining({ ownScore: 5, ownSubmitted: true }));
  });

  it('Q2 · una corrección en la cola se ve encima de lo que tiene el servidor', async () => {
    getScoringViewUseCase.execute.mockResolvedValue(
      vistaCon([hoyo(5, [fila('u1', { ownScore: 4, ownSubmitted: true })])])
    );
    const app = await monta();
    enCola = [guardada(5, { ownScore: 6, markedPlayerId: 'u2' })];

    app.rerender();

    expect(visible(app.result, 5, 'u1')).toEqual(expect.objectContaining({ ownScore: 6, ownSubmitted: true }));
  });

  it('Q3 · un golpe rechazado deja de verse: manda lo del servidor', async () => {
    getScoringViewUseCase.execute.mockResolvedValue(
      vistaCon([hoyo(5, [fila('u1', { ownScore: 4, ownSubmitted: true })])])
    );
    const app = await monta();
    submitHoleScoreUseCase.execute.mockRejectedValueOnce(
      Object.assign(new Error('Match completed'), { status: 409 })
    );

    await act(async () => { await app.result.current.submitScore(5, { ownScore: 5, markedPlayerId: 'u2' }); });

    expect(visible(app.result, 5, 'u1')).toEqual(expect.objectContaining({ ownScore: 4 }));
  });

  it('Q4 · lo que ya llegó no manda sobre un cambio posterior del servidor', async () => {
    const app = await monta();
    submitHoleScoreUseCase.execute.mockResolvedValueOnce(
      vistaCon([hoyo(5, [fila('u1', { ownScore: 5, ownSubmitted: true })])])
    );
    await act(async () => { await app.result.current.submitScore(5, { ownScore: 5, markedPlayerId: 'u2' }); });
    getScoringViewUseCase.execute.mockResolvedValue(
      vistaCon([hoyo(5, [fila('u1', { ownScore: 7, ownSubmitted: true })])])
    );

    await act(async () => { await app.result.current.refetch(); });

    expect(visible(app.result, 5, 'u1')).toEqual(expect.objectContaining({ ownScore: 7 }));
  });

  it('Q5 · un golpe propio en la cola no toca la fila del marcado', async () => {
    const delMarcado = fila('u2', { markerScore: 4, markerSubmitted: true, validationStatus: 'match' });
    getScoringViewUseCase.execute.mockResolvedValue(
      vistaCon([hoyo(5, [fila('u1', { ownScore: 4, ownSubmitted: true }), delMarcado])])
    );
    const app = await monta();
    enCola = [guardada(5, { ownScore: 6, markedPlayerId: 'u2' })];

    app.rerender();

    expect(visible(app.result, 5, 'u2')).toEqual(delMarcado);
  });

  it('Q5b · y el golpe del marcado en la cola va a la fila del marcado', async () => {
    const app = await monta();
    enCola = [guardada(5, { ownScore: 6, markedPlayerId: 'u2', markedScore: 5 })];

    app.rerender();

    expect(visible(app.result, 5, 'u2')).toEqual(expect.objectContaining({ markerScore: 5, markerSubmitted: true }));
  });

  it('Q6 · la raya en la cola se ve como raya, no como hueco', async () => {
    const app = await monta();
    enCola = [guardada(5, { ownScore: null, markedPlayerId: 'u2' })];

    app.rerender();

    expect(visible(app.result, 5, 'u1')).toEqual(expect.objectContaining({ ownScore: null, ownSubmitted: true }));
  });

  it('Q7 · con otro golpe en la cola, la validación del servidor ya no vale: pendiente', async () => {
    getScoringViewUseCase.execute.mockResolvedValue(
      vistaCon([hoyo(5, [fila('u1', { ownScore: 4, ownSubmitted: true, validationStatus: 'match' })])])
    );
    const app = await monta();
    enCola = [guardada(5, { ownScore: 6, markedPlayerId: 'u2' })];

    app.rerender();

    expect(visible(app.result, 5, 'u1')).toEqual(expect.objectContaining({ ownScore: 6, validationStatus: 'pending' }));
  });

  it('Q7b · si la cola dice lo mismo que el servidor, su validación se respeta', async () => {
    getScoringViewUseCase.execute.mockResolvedValue(
      vistaCon([hoyo(5, [fila('u1', { ownScore: 4, ownSubmitted: true, validationStatus: 'match' })])])
    );
    const app = await monta();
    enCola = [guardada(5, { ownScore: 4, markedPlayerId: 'u2' })];

    app.rerender();

    expect(visible(app.result, 5, 'u1')).toEqual(expect.objectContaining({ ownScore: 4, validationStatus: 'match' }));
  });

  it('Q8 · los hoyos validados cuentan solo lo del servidor', async () => {
    getScoringViewUseCase.execute.mockResolvedValue(
      vistaCon([hoyo(5, [fila('u1', { ownScore: 4, ownSubmitted: true, validationStatus: 'match' })])])
    );
    const app = await monta();
    expect(app.result.current.validatedHoles).toBe(1);
    enCola = [guardada(5, { ownScore: 6, markedPlayerId: 'u2' })];

    app.rerender();

    // Un golpe que aún no ha llegado no está validado por nadie
    expect(app.result.current.validatedHoles).toBe(1);
  });

  it('Q9 · un sondeo que salió antes de que llegara un envío no pisa la vista', async () => {
    const app = await monta();
    const sondeo = enVuelo();
    getScoringViewUseCase.execute.mockReturnValueOnce(sondeo.promesa);
    let pedida;
    act(() => { pedida = app.result.current.refetch(); });
    const trasEnviar = vistaCon([hoyo(5, [fila('u1', { ownScore: 5, ownSubmitted: true })])]);
    submitHoleScoreUseCase.execute.mockResolvedValueOnce(trasEnviar);
    await act(async () => { await app.result.current.submitScore(5, { ownScore: 5, markedPlayerId: 'u2' }); });

    await act(async () => { sondeo.suelta(vistaCon([])); await pedida; });

    expect(app.result.current.scoringView.scores).toEqual(trasEnviar.scores);
  });

  it('Q9b · lo mismo con el vaciado: el sondeo de antes no pisa lo que el vaciado ya mandó', async () => {
    const app = await monta();
    const sondeo = enVuelo();
    getScoringViewUseCase.execute.mockReturnValueOnce(sondeo.promesa);
    let pedida;
    act(() => { pedida = app.result.current.refetch(); });
    enCola = [guardada(3, { ownScore: 4, markedPlayerId: 'u2' })];
    const trasVaciar = vistaCon([hoyo(3, [fila('u1', { ownScore: 4, ownSubmitted: true })])]);
    getScoringViewUseCase.execute.mockResolvedValue(trasVaciar);
    await act(async () => {
      window.dispatchEvent(new globalThis.Event('online'));
      await new Promise((r) => setTimeout(r, 30));
    });
    await waitFor(() => expect(enCola).toEqual([]));

    await act(async () => { sondeo.suelta(vistaCon([])); await pedida; });

    expect(app.result.current.scoringView.scores).toEqual(trasVaciar.scores);
  });

  it('Q9c · durante el vaciado, lo que ya llegó se ve aunque la pasada siga y llegue un sondeo viejo', async () => {
    // El vaciado saca cada golpe de la cola en cuanto llega, pero pedía la vista
    // solo al terminar la pasada: en medio, ese hoyo no estaba ni en la cola ni
    // en la vista, y con mala cobertura eso son segundos con la casilla vacía
    const app = await monta();
    const sondeo = enVuelo();
    getScoringViewUseCase.execute.mockReturnValueOnce(sondeo.promesa);
    let pedida;
    act(() => { pedida = app.result.current.refetch(); });
    enCola = [
      guardada(3, { ownScore: 4, markedPlayerId: 'u2' }, 1),
      guardada(4, { ownScore: 5, markedPlayerId: 'u2' }, 2),
    ];
    submitHoleScoreUseCase.execute
      .mockResolvedValueOnce(vistaCon([hoyo(3, [fila('u1', { ownScore: 4, ownSubmitted: true })])]))
      .mockReturnValueOnce(new Promise(() => {}));
    await act(async () => {
      window.dispatchEvent(new globalThis.Event('online'));
      await new Promise((r) => setTimeout(r, 30));
    });
    // El 3 ya llegó y salió de la cola; el 4 sigue en camino
    await waitFor(() => expect(enCola.map((e) => e.holeNumber)).toEqual([4]));

    await act(async () => { sondeo.suelta(vistaCon([])); await pedida; });
    // Un render más, para leer la cola como está AHORA y no como estaba
    app.rerender();

    expect(visible(app.result, 3, 'u1')).toEqual(expect.objectContaining({ ownScore: 4, ownSubmitted: true }));
  });

  it('Q10 · sondeos solapados sin envíos por medio se aplican: la vista no se congela con red lenta', async () => {
    // Con «la última petición gana», cada respuesta que tarda más que el
    // sondeo llega con otra ya en camino y se tira: la vista no se movería
    // nunca justo cuando peor está la red
    const app = await monta();
    const primero = enVuelo();
    const segundo = enVuelo();
    getScoringViewUseCase.execute
      .mockReturnValueOnce(primero.promesa)
      .mockReturnValueOnce(segundo.promesa);
    let a;
    let b;
    act(() => { a = app.result.current.refetch(); });
    act(() => { b = app.result.current.refetch(); });
    const delPrimero = vistaCon([hoyo(2, [fila('u1', { ownScore: 3, ownSubmitted: true })])]);

    await act(async () => { primero.suelta(delPrimero); await a; });

    expect(app.result.current.scoringView.scores).toEqual(delPrimero.scores);
    await act(async () => { segundo.suelta(vistaCon([])); await b; });
  });

  it('Q10b · pero una respuesta más vieja que otra ya aplicada no hace retroceder la vista', async () => {
    // El otro lado de Q10: se descarta lo que es más viejo que algo YA
    // aplicado, no lo que salió antes de que saliera otra
    const app = await monta();
    const primero = enVuelo();
    const segundo = enVuelo();
    getScoringViewUseCase.execute
      .mockReturnValueOnce(primero.promesa)
      .mockReturnValueOnce(segundo.promesa);
    let a;
    let b;
    act(() => { a = app.result.current.refetch(); });
    act(() => { b = app.result.current.refetch(); });
    const delSegundo = vistaCon([hoyo(2, [fila('u1', { ownScore: 4, ownSubmitted: true })])]);
    await act(async () => { segundo.suelta(delSegundo); await b; });

    await act(async () => { primero.suelta(vistaCon([])); await a; });

    expect(app.result.current.scoringView.scores).toEqual(delSegundo.scores);
  });

  describe('al cambiar de partido sin salir de la pantalla (CodeRabbit, PR #608)', () => {
    // La ruta no lleva `key`: ir de un partido a otro deja el hook montado, con
    // la vista del anterior y sus peticiones todavía en camino. Hoy solo se
    // llega tecleando la URL, pero un enlace directo entre partidos lo abriría
    const vistaDe = (id, scores = [], extra = {}) => ({ ...mockScoringView, matchId: id, scores, ...extra });

    const montaEn = async (id) => {
      const app = renderHook(({ matchId }) => useScoring(matchId, 'u1'), { initialProps: { matchId: id } });
      await waitFor(() => expect(app.result.current.isLoading).toBe(false));
      await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
      return app;
    };

    // Todas las peticiones de la vista del partido nuevo esperan a que se suelten
    const conLaNuevaRetenida = () => {
      const nueva = enVuelo();
      getScoringViewUseCase.execute.mockImplementation((id) =>
        id === 'm-2' ? nueva.promesa.then(() => vistaDe('m-2')) : Promise.resolve(vistaDe(id))
      );
      return nueva;
    };

    // Pasa al partido nuevo, deja que conteste tarde lo del anterior y SOLO
    // después suelta la vista del nuevo
    const pasaAlNuevoYSuelta = async (app, nueva, sueltaLoViejo) => {
      app.rerender({ matchId: 'm-2' });
      await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
      await act(async () => { await sueltaLoViejo(); });
      await act(async () => {
        nueva.suelta();
        await new Promise((r) => setTimeout(r, 20));
      });
    };

    beforeEach(() => {
      getScoringViewUseCase.execute.mockImplementation(async (id) => vistaDe(id));
    });

    it('Q12 · la vista con la cola no mezcla el servidor del partido anterior con la cola del nuevo', async () => {
      getScoringViewUseCase.execute.mockImplementation(async (id) =>
        vistaDe(id, id === 'm-1' ? [hoyo(5, [fila('u1', { ownScore: 3, ownSubmitted: true })])] : [])
      );
      const app = await montaEn('m-1');
      conLaNuevaRetenida();
      enCola = [{ ...guardada(7, { ownScore: 4, markedPlayerId: 'u2' }), matchId: 'm-2' }];
      // El vaciado de entrar en el nuevo se queda en camino: la anotación sigue en la cola
      submitHoleScoreUseCase.execute.mockReturnValue(new Promise(() => {}));

      app.rerender({ matchId: 'm-2' });
      await act(async () => { await new Promise((r) => setTimeout(r, 20)); });

      // La vista que hay es todavía la del partido anterior
      expect(app.result.current.scoringView.matchId).toBe('m-1');
      expect(app.result.current.scoresVisibles.find((s) => s.holeNumber === 5)).toBeUndefined();
      expect(visible(app.result, 7, 'u1')).toEqual(expect.objectContaining({ ownScore: 4 }));
    });

    it('Q13 · la respuesta tardía de un envío del partido anterior no tapa la vista del nuevo', async () => {
      const app = await montaEn('m-1');
      const envio = enVuelo();
      submitHoleScoreUseCase.execute.mockReturnValueOnce(envio.promesa);
      let enviando;
      act(() => { enviando = app.result.current.submitScore(5, { ownScore: 5, markedPlayerId: 'u2' }); });
      const nueva = conLaNuevaRetenida();

      await pasaAlNuevoYSuelta(app, nueva, async () => {
        envio.suelta(vistaDe('m-1', [hoyo(5, [fila('u1', { ownScore: 5, ownSubmitted: true })])]));
        await enviando;
      });

      await waitFor(() => expect(app.result.current.scoringView.matchId).toBe('m-2'));
    });

    it('Q14 · lo que el vaciado del partido anterior manda tarde no tapa la vista del nuevo', async () => {
      const app = await montaEn('m-1');
      enCola = [guardada(3, { ownScore: 4, markedPlayerId: 'u2' })];
      const envio = enVuelo();
      submitHoleScoreUseCase.execute.mockReturnValueOnce(envio.promesa);
      await act(async () => {
        window.dispatchEvent(new globalThis.Event('online'));
        await new Promise((r) => setTimeout(r, 20));
      });
      const nueva = conLaNuevaRetenida();

      await pasaAlNuevoYSuelta(app, nueva, async () => {
        envio.suelta(vistaDe('m-1', [hoyo(3, [fila('u1', { ownScore: 4, ownSubmitted: true })])]));
        await new Promise((r) => setTimeout(r, 20));
      });

      await waitFor(() => expect(app.result.current.scoringView.matchId).toBe('m-2'));
    });

    it('Q15 · conceder en el partido anterior y que conteste tarde no tapa la vista del nuevo', async () => {
      const app = await montaEn('m-1');
      const concesion = enVuelo();
      concedeMatchUseCase.execute.mockReturnValueOnce(concesion.promesa);
      let concediendo;
      act(() => { concediendo = app.result.current.concedeMatch('A', 'motivo'); });
      const nueva = conLaNuevaRetenida();

      await pasaAlNuevoYSuelta(app, nueva, async () => {
        concesion.suelta();
        await concediendo;
      });

      await waitFor(() => expect(app.result.current.scoringView.matchId).toBe('m-2'));
    });

    it('Q16 · entregar la tarjeta del partido anterior y que conteste tarde no tapa la vista del nuevo', async () => {
      getScoringViewUseCase.execute.mockImplementation(async (id) =>
        vistaDe(id, [hoyo(1, [fila('u1', { ownScore: 4, ownSubmitted: true, validationStatus: 'match' })])], { isDecided: true })
      );
      const app = await montaEn('m-1');
      expect(app.result.current.canSubmitScorecard).toBe(true);
      const entrega = enVuelo();
      submitScorecardUseCase.execute.mockReturnValueOnce(entrega.promesa);
      let entregando;
      act(() => { entregando = app.result.current.submitScorecard(); });
      const nueva = conLaNuevaRetenida();

      await pasaAlNuevoYSuelta(app, nueva, async () => {
        entrega.suelta({ result: null });
        await entregando;
      });

      await waitFor(() => expect(app.result.current.scoringView.matchId).toBe('m-2'));
    });
  });
});
