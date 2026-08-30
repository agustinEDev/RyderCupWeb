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

/**
 * LA TABLA B — vaciar los golpes guardados.
 *
 * Se dispara cuando el sondeo de la pantalla responde: si responde, hay
 * conexión. No hace falta deducir un estado global de la red — el propio
 * tráfico de esta pantalla ya es la señal, y es la más fiable que hay.
 *
 *   situación                          | qué pasa
 *   hay pendientes y el sondeo responde| se envían en orden; el que llega se borra
 *   uno no llega, o 401, o 5xx         | se para ahí; los demás esperan al siguiente
 *   uno da 404/403/409/400             | se descarta ESE, sigue con los demás
 *   el hoyo ya tiene anotación DISTINTA| no se envía: se aparta como discrepancia
 *   el hoyo tiene la MISMA anotación   | se envía; no hay nada que contar
 *   ya se estaba vaciando              | no se empieza otra vez
 *
 * LA TABLA C — resolver una discrepancia. La app no sabe quién tiene razón, así
 * que no elige: lo hace el jugador después de hablar con su compañero.
 *
 *   elige el suyo   | se envía y sale de la lista
 *   elige el que hay| se descarta el suyo y sale de la lista
 */
describe('useQuickMatchScoring · vaciar lo guardado (FE #515, tablas B y C)', () => {
  const rechazo = (status) => Object.assign(new Error(`HTTP ${status}`), { status });
  const pendiente = (holeNumber, score, participantId = 'user-1') =>
    ({ matchId: 'qm-1', holeNumber, participantId, scoreData: { score } });

  beforeEach(() => {
    vi.clearAllMocks();
    getGolfCourseUseCase.execute.mockResolvedValue({ holes: [], tees: [], name: 'Campo' });
    getQuickMatchUseCase.execute.mockResolvedValue(mockQuickMatch);
    offlineQueue.getByMatch.mockReturnValue([]);
    submitQuickMatchHoleScoreUseCase.execute.mockResolvedValue({});
    // `clearAllMocks` borra las llamadas, no la implementación: sin esto llega
    // rechazando desde el test de proxy de la tabla A
    submitQuickMatchProxyHoleScoreUseCase.execute.mockResolvedValue({});
  });

  const montaCon = async (pendientes, partida = mockQuickMatch) => {
    offlineQueue.getByMatch.mockReturnValue(pendientes);
    getQuickMatchUseCase.execute.mockResolvedValue(partida);
    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    return result;
  };

  it('envía lo guardado en cuanto el sondeo responde, y lo borra', async () => {
    await montaCon([pendiente(7, 5)]);

    await waitFor(() =>
      expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledWith('qm-1', 7, 5)
    );
    await waitFor(() => expect(offlineQueue.remove).toHaveBeenCalledWith('qm-1', 7, 'user-1'));
  });

  it('al volver a anotar bien un hoyo perdido, el aviso rojo se retira', async () => {
    // El aviso pide volver a anotarlo. Si al hacerlo siguiera ahí, estaría
    // pidiendo algo que ya está hecho, y el jugador no sabría cuándo parar.
    submitQuickMatchHoleScoreUseCase.execute
      .mockRejectedValueOnce(rechazo(409))
      .mockResolvedValueOnce({});

    const result = await montaCon([pendiente(7, 5)]);
    await waitFor(() =>
      expect(result.current.perdidos).toContainEqual(expect.objectContaining({ holeNumber: 7 }))
    );

    await act(async () => { await result.current.submitScore(7, 'user-1', 6); });

    expect(result.current.perdidos).toEqual([]);
  });

  it('al abrir la pantalla ya sin cobertura, cuenta lo que quedó de antes', async () => {
    // El caso que originó todo: el jugador vuelve a la app en el campo. Si el
    // contador empezara en cero, el aviso no saldría hasta el primer vaciado
    // —que sin cobertura no llega— y sus golpes parecerían no existir.
    offlineQueue.getByMatch.mockReturnValue([pendiente(7, 5), pendiente(8, 4)]);
    offlineQueue.size.mockReturnValue(2);
    getQuickMatchUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pendientes).toBe(2);
  });

  it('un golpe de otro jugador sale por la ruta de proxy, no por la propia', async () => {
    // Un anotador cubre a invitados —y en foursomes, a los cuatro—, así que en
    // la cola hay golpes que no son suyos. Y el vaciado del primer sondeo corre
    // cuando `quickMatch` todavía es null: si el participante saliera del
    // estado, TODO iría por proxy, incluido lo propio.
    await montaCon([pendiente(7, 5, 'guest-1'), pendiente(8, 4, 'user-1')]);

    await waitFor(() =>
      expect(submitQuickMatchProxyHoleScoreUseCase.execute)
        .toHaveBeenCalledWith('qm-1', 'guest-1', 7, 5)
    );
    await waitFor(() =>
      expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledWith('qm-1', 8, 4)
    );
    expect(submitQuickMatchProxyHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('si uno no llega, para ahí y no toca los demás', async () => {
    submitQuickMatchHoleScoreUseCase.execute
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await montaCon([pendiente(7, 5), pendiente(8, 4)]);

    await waitFor(() => expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledTimes(1));
    expect(offlineQueue.remove).not.toHaveBeenCalled();
  });

  it.each([[401], [503]])('con %i tampoco sigue: no es culpa del golpe', async (status) => {
    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValueOnce(rechazo(status));

    await montaCon([pendiente(7, 5), pendiente(8, 4)]);

    await waitFor(() => expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledTimes(1));
    expect(offlineQueue.remove).not.toHaveBeenCalled();
  });

  it('descarta el que el servidor rechaza y sigue con el resto', async () => {
    submitQuickMatchHoleScoreUseCase.execute
      .mockRejectedValueOnce(rechazo(409))
      .mockResolvedValueOnce({});

    const result = await montaCon([pendiente(7, 5), pendiente(8, 4)]);

    await waitFor(() => expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledTimes(2));
    expect(offlineQueue.remove).toHaveBeenCalledWith('qm-1', 7, 'user-1');
    expect(result.current.perdidos).toContainEqual(expect.objectContaining({ holeNumber: 7 }));
  });

  it('un hoyo con anotación DISTINTA no se envía: se aparta', async () => {
    // La app no sabe quién tiene razón, así que no elige
    const conAnotacion = {
      ...mockQuickMatch,
      holeScores: [{ holeNumber: 7, participantId: 'user-1', score: 6, recordedByParticipantId: 'user-2' }],
    };

    const result = await montaCon([pendiente(7, 5)], conAnotacion);

    expect(submitQuickMatchHoleScoreUseCase.execute).not.toHaveBeenCalled();
    expect(result.current.discrepancias).toContainEqual(
      expect.objectContaining({ holeNumber: 7, mio: 5, enElServidor: 6 })
    );
  });

  it('si coincide, se envía y no se cuenta nada', async () => {
    const igual = {
      ...mockQuickMatch,
      holeScores: [{ holeNumber: 7, participantId: 'user-1', score: 5, recordedByParticipantId: 'user-2' }],
    };

    const result = await montaCon([pendiente(7, 5)], igual);

    await waitFor(() => expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalled());
    expect(result.current.discrepancias).toHaveLength(0);
  });

  it('una bola recogida frente a un número es una discrepancia', async () => {
    // Los dos llegan sin número y significan lo contrario, así que el valor
    // cuenta: `null` no es «no hay anotación»
    const conNumero = {
      ...mockQuickMatch,
      holeScores: [{ holeNumber: 7, participantId: 'user-1', score: 5, recordedByParticipantId: 'user-2' }],
    };

    const result = await montaCon([pendiente(7, null)], conNumero);

    expect(result.current.discrepancias).toHaveLength(1);
    expect(submitQuickMatchHoleScoreUseCase.execute).not.toHaveBeenCalled();
  });

  it('no se vacía dos veces a la vez', async () => {
    let suelta;
    submitQuickMatchHoleScoreUseCase.execute.mockImplementation(
      () => new Promise((resolve) => { suelta = resolve; })
    );

    const result = await montaCon([pendiente(7, 5)]);
    await act(async () => { await result.current.refetch(); });

    expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);
    suelta?.({});
  });

  it('resolver a mi favor lo envía y lo saca de la lista', async () => {
    const conAnotacion = {
      ...mockQuickMatch,
      holeScores: [{ holeNumber: 7, participantId: 'user-1', score: 6, recordedByParticipantId: 'user-2' }],
    };
    const result = await montaCon([pendiente(7, 5)], conAnotacion);

    await act(async () => { await result.current.resuelveDiscrepancia(7, 'user-1', 'mio'); });

    expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledWith('qm-1', 7, 5);
    expect(result.current.discrepancias).toHaveLength(0);
  });

  it('resolver a favor del que hay descarta el mío sin enviarlo', async () => {
    const conAnotacion = {
      ...mockQuickMatch,
      holeScores: [{ holeNumber: 7, participantId: 'user-1', score: 6, recordedByParticipantId: 'user-2' }],
    };
    const result = await montaCon([pendiente(7, 5)], conAnotacion);

    await act(async () => { await result.current.resuelveDiscrepancia(7, 'user-1', 'elQueHay'); });

    expect(submitQuickMatchHoleScoreUseCase.execute).not.toHaveBeenCalled();
    expect(offlineQueue.remove).toHaveBeenCalledWith('qm-1', 7, 'user-1');
    expect(result.current.discrepancias).toHaveLength(0);
  });
});
