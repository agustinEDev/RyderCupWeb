import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useQuickMatchScoring } from './useQuickMatchScoring';

vi.mock('../utils/scoringOfflineQueue', () => ({
  enqueue: vi.fn(),
  remove: vi.fn(),
  getByMatch: vi.fn(() => []),
  size: vi.fn(() => 0),
  clear: vi.fn(),
}));

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
  submitQuickMatchHoleScoreUseCase,
  submitQuickMatchProxyHoleScoreUseCase,
} from '../composition';
import * as offlineQueue from '../utils/scoringOfflineQueue';

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

/**
 * LA TABLA A — qué pasa al anotar un golpe, según cómo termine SU envío.
 *
 * Se decide por el resultado del envío y no por lo que crea el estado de
 * conexión: así no hay ninguna ventana en la que la aplicación se crea
 * conectada y pierda el golpe en silencio.
 *
 *   cómo termina el envío        | qué pasa
 *   -----------------------------|------------------------------------------
 *   llega bien                   | guardado en el servidor; nada pendiente
 *   no llega respuesta (red)     | se guarda en el móvil
 *   401 la sesión no vale        | se guarda: el problema no es el golpe
 *   5xx el servidor falla        | se guarda: ahora está mal, luego quizá no
 *   404 / 403 / 409 / 400        | NO se guarda; se dice por qué. Reintentar
 *                                | no cambiaría nada
 *
 * Y una regla que atraviesa la tabla: **guardar no es un error**. Para el
 * jugador el golpe está anotado, solo que todavía no ha salido del móvil, así
 * que no se le enseña el recuadro rojo; eso se reserva para lo que de verdad no
 * se pudo guardar.
 */
describe('useQuickMatchScoring · anotar sin conexión (FE #515, tabla A)', () => {
  const rechazo = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

  beforeEach(() => {
    vi.clearAllMocks();
    offlineQueue.enqueue.mockClear();
    getQuickMatchUseCase.execute.mockResolvedValue(mockQuickMatch);
    getGolfCourseUseCase.execute.mockResolvedValue({ holes: [], tees: [], name: 'Campo' });
  });

  const anota = async (fallo) => {
    if (fallo) submitQuickMatchHoleScoreUseCase.execute.mockRejectedValue(fallo);
    else submitQuickMatchHoleScoreUseCase.execute.mockResolvedValue({});

    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.submitScore(7, 'user-1', 5); });
    return result;
  };

  it('llega bien: no se guarda nada en el móvil', async () => {
    await anota(null);

    expect(offlineQueue.enqueue).not.toHaveBeenCalled();
  });

  it('no llega respuesta: se guarda en el móvil', async () => {
    await anota(new TypeError('Failed to fetch'));

    expect(offlineQueue.enqueue).toHaveBeenCalledWith('qm-1', 7, { score: 5 }, 'user-1');
  });

  it('401: se guarda, porque el problema es la sesión y no el golpe', async () => {
    await anota(rechazo(401));

    expect(offlineQueue.enqueue).toHaveBeenCalled();
  });

  it('5xx: se guarda, porque el servidor puede ir bien después', async () => {
    await anota(rechazo(503));

    expect(offlineQueue.enqueue).toHaveBeenCalled();
  });

  it.each([404, 403, 409, 400])('%i: NO se guarda, reintentarlo no cambiaría nada', async (status) => {
    const result = await anota(rechazo(status));

    expect(offlineQueue.enqueue).not.toHaveBeenCalled();
    expect(result.current.saveError).not.toBeNull();
  });

  it('guardar para después no es un error: no sale el recuadro rojo', async () => {
    // Para el jugador el golpe está anotado. Enseñarle un error diría lo
    // contrario de lo que ha pasado
    const result = await anota(new TypeError('Failed to fetch'));

    expect(offlineQueue.enqueue).toHaveBeenCalled();
    expect(result.current.saveError).toBeNull();
  });

  it('la partida ya cerrada (409) dice qué hoyo no se pudo guardar', async () => {
    // Es el caso realista de perder un golpe: anotas sin cobertura y alguien
    // termina la partida mientras tanto. Al menos hay que decir cuál era
    const result = await anota(rechazo(409));

    expect(result.current.saveError?.holeNumber).toBe(7);
  });

  it('el golpe de otro jugador se guarda a su nombre, no al mío', async () => {
    // Cada participante va por separado: sin eso, anotar al segundo del hoyo
    // borraba al primero
    submitQuickMatchProxyHoleScoreUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.submitScore(7, 'user-2', 4); });

    expect(offlineQueue.enqueue).toHaveBeenCalledWith('qm-1', 7, { score: 4 }, 'user-2');
  });

  it('la bola recogida se guarda: es una anotación, no la ausencia de una', async () => {
    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.submitScore(7, 'user-1', null); });

    expect(offlineQueue.enqueue).toHaveBeenCalledWith('qm-1', 7, { score: null }, 'user-1');
  });
});
