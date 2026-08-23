import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useQuickMatchScoring } from './useQuickMatchScoring';

vi.mock('../composition', () => ({
  getQuickMatchUseCase: { execute: vi.fn() },
  getGolfCourseUseCase: { execute: vi.fn() },
  submitQuickMatchHoleScoreUseCase: { execute: vi.fn() },
  submitQuickMatchProxyHoleScoreUseCase: { execute: vi.fn() },
  completeQuickMatchUseCase: { execute: vi.fn() },
  cancelQuickMatchUseCase: { execute: vi.fn() },
}));

import {
  getQuickMatchUseCase,
  getGolfCourseUseCase,
  cancelQuickMatchUseCase,
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

describe('useQuickMatchScoring · cancelar la partida', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getQuickMatchUseCase.execute.mockResolvedValue(mockQuickMatch);
    getGolfCourseUseCase.execute.mockResolvedValue({ id: 'course-1', name: 'Club', tees: [] });
  });

  it('dice que si cuando se cancela, y recarga la partida', async () => {
    // El aviso del dialogo se cierra o no segun este valor: sin contrato, un
    // `return` sin valor lo dejaria abierto para siempre y ningun test lo veria.
    cancelQuickMatchUseCase.execute.mockResolvedValue({});

    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    getQuickMatchUseCase.execute.mockClear();

    let resultado;
    await act(async () => {
      resultado = await result.current.cancelMatch();
    });

    expect(resultado.ok).toBe(true);
    expect(cancelQuickMatchUseCase.execute).toHaveBeenCalledWith('qm-1');
    expect(getQuickMatchUseCase.execute).toHaveBeenCalled();
  });

  it('un sondeo viejo no resucita una partida ya cancelada', async () => {
    // El sondeo cada 10 s puede salir ANTES del POST y contestar DESPUES: si se
    // aplicara, devolveria la partida a IN_PROGRESS, la pantalla dejaria anotar
    // otra vez y cada guardado se estrellaria contra un 409.
    let contestarSondeo;
    getQuickMatchUseCase.execute
      .mockResolvedValueOnce(mockQuickMatch)
      .mockImplementationOnce(() => new Promise((res) => { contestarSondeo = res; }));

    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // El sondeo sale y se queda en vuelo
    await act(async () => { result.current.refetch(); });

    cancelQuickMatchUseCase.execute.mockResolvedValue({
      ...mockQuickMatch,
      status: 'CANCELLED',
      isCancelled: true,
      isInProgress: false,
    });
    getQuickMatchUseCase.execute.mockResolvedValue({
      ...mockQuickMatch,
      status: 'CANCELLED',
      isCancelled: true,
      isInProgress: false,
    });

    await act(async () => { await result.current.cancelMatch(); });
    expect(result.current.quickMatch.isCancelled).toBe(true);

    // Y ahora contesta el sondeo viejo, con la foto de antes
    await act(async () => {
      contestarSondeo(mockQuickMatch);
      await Promise.resolve();
    });

    expect(result.current.quickMatch.isCancelled).toBe(true);
  });

  it('dice que no cuando el servidor lo rechaza, sin ensuciar el aviso de anotar', async () => {
    // El fallo lo cuenta el dialogo. Si acabara en `saveError`, la pantalla
    // pintaria «no se ha podido guardar el resultado» —que no es lo que ha
    // pasado— y ademas se quedaria pegado hasta el siguiente guardado bueno.
    const fallo = new Error('conflicto');
    fallo.status = 409;
    cancelQuickMatchUseCase.execute.mockRejectedValue(fallo);

    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resultado;
    await act(async () => {
      resultado = await result.current.cancelMatch();
    });

    expect(resultado.ok).toBe(false);
    // Y devuelve el error, para que el dialogo pueda distinguir un 409 —ya
    // estaba cerrada— de haberse quedado sin cobertura
    expect(resultado.error).toBe(fallo);
    expect(result.current.saveError).toBeNull();
  });

  it('no llama al servidor si no es quien creo la partida', async () => {
    // El backend lo rechaza con NotQuickMatchCreatorError; pedirselo igual solo
    // sirve para gastar una peticion y pintar un error.
    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-2'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resultado;
    await act(async () => {
      resultado = await result.current.cancelMatch();
    });

    expect(resultado.ok).toBe(false);
    expect(cancelQuickMatchUseCase.execute).not.toHaveBeenCalled();
  });
});
