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
  it('un 422 no se guarda para luego: es el resultado el que no vale', async () => {
    // Es el código real de Pydantic, y el que la pantalla traduce por «ese
    // resultado no es válido». Guardarlo dejaría una entrada imposible a la
    // cabeza de la cola bloqueando todo lo que viene detrás, en cada sondeo.
    const result = await anota(rechazo(422));
    expect(offlineQueue.enqueue).not.toHaveBeenCalled();
    expect(result.current.saveError).toBeTruthy();
  });

  it.each([[401], [408], [429], [500]])('un %i sí se guarda: el golpe no tiene la culpa', async (status) => {
    await anota(rechazo(status));
    expect(offlineQueue.enqueue).toHaveBeenCalled();
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
  const conAnotacionDe = (score) => ({
    ...mockQuickMatch,
    holeScores: [{ holeNumber: 7, participantId: 'user-1', score, recordedByParticipantId: 'user-2' }],
  });

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

  it('lo que ya coincide se quita de la cola sin volver a enviarlo', async () => {
    // Reenviarlo no añade nada y sí puede restar: si entre medias alguien
    // termina la partida, el 409 lo daría por perdido y le pediría al jugador
    // que volviera a anotar un hoyo que el servidor ya tiene, con ese resultado
    const igual = {
      ...mockQuickMatch,
      holeScores: [{ holeNumber: 7, participantId: 'user-1', score: 5, recordedByParticipantId: 'user-2' }],
    };

    const result = await montaCon([pendiente(7, 5)], igual);

    await waitFor(() => expect(offlineQueue.remove).toHaveBeenCalledWith('qm-1', 7, 'user-1'));
    expect(submitQuickMatchHoleScoreUseCase.execute).not.toHaveBeenCalled();
    expect(result.current.discrepancias).toHaveLength(0);
    expect(result.current.perdidos).toEqual([]);
  });

  it('resolver a mi favor no envía en el acto: deja la decisión tomada', async () => {
    // Enviar aquí mismo abría tres agujeros: si no llega no se entera nadie, el
    // sondeo puede estar vaciando a la vez y mandarlo dos veces, y la decisión
    // se perdía al cerrar la app. Guardada en la entrada, la envía el vaciado.
    const result = await montaCon([pendiente(7, 5)], conAnotacionDe(6));

    await act(async () => { await result.current.resuelveDiscrepancia(7, 'user-1', 'mio'); });

    expect(offlineQueue.enqueue).toHaveBeenCalledWith(
      'qm-1', 7, expect.objectContaining({ score: 5, decidido: true }), 'user-1'
    );
    expect(result.current.discrepancias).toHaveLength(0);
  });

  it('lo ya decidido se envía sin volver a preguntar', async () => {
    const decidida = { ...pendiente(7, 5), scoreData: { score: 5, decidido: true } };

    const result = await montaCon([decidida], conAnotacionDe(6));

    await waitFor(() => expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledWith('qm-1', 7, 5));
    expect(result.current.discrepancias).toHaveLength(0);
  });

  it('resolver a favor del que hay descarta el mío sin enviarlo', async () => {
    const result = await montaCon([pendiente(7, 5)], conAnotacionDe(6));

    await act(async () => { await result.current.resuelveDiscrepancia(7, 'user-1', 'elQueHay'); });

    expect(submitQuickMatchHoleScoreUseCase.execute).not.toHaveBeenCalled();
    expect(offlineQueue.remove).toHaveBeenCalledWith('qm-1', 7, 'user-1');
    expect(result.current.discrepancias).toHaveLength(0);
  });

  it('con un valor que no es ninguno de los dos no toca nada', async () => {
    // Las dos ramas hacen cosas opuestas y una de ellas descarta la anotación
    // del jugador: si un tercer valor cayera en cualquiera de ellas, un error
    // de escritura en quien llame borraría un golpe sin decir nada
    const result = await montaCon([pendiente(7, 5)], conAnotacionDe(6));
    await waitFor(() => expect(result.current.discrepancias).toHaveLength(1));

    await act(async () => { await result.current.resuelveDiscrepancia(7, 'user-1', 'servidor'); });

    expect(offlineQueue.remove).not.toHaveBeenCalled();
    expect(offlineQueue.enqueue).not.toHaveBeenCalled();
    expect(result.current.discrepancias).toHaveLength(1);
  });
});

/**
 * LA TABLA E — lo guardado en el móvil se VE.
 *
 * Sin esto la función engaña: el jugador anota, no sale ningún error porque
 * para él está anotado, y la casilla sigue diciendo «Anotar». Lo natural es
 * volver a pulsar. La tarjeta, el selector de hoyo y la clasificación salen
 * todos de la misma lista, y la clasificación se calcula aquí, así que basta
 * con sumar la cola a esa lista para que las tres lo vean.
 *
 *   caso                                   | qué se ve en la casilla
 *   ---------------------------------------|--------------------------------
 *   el servidor no tiene el hoyo           | lo guardado en el móvil
 *   el servidor lo tiene y coincide        | lo del servidor (da igual)
 *   el servidor lo tiene y NO coincide     | lo del SERVIDOR: está en disputa
 *                                          | y la aplicación no elige
 *   ...y el jugador ya decidió que el suyo | lo suyo, en cuanto lo decide
 */
/**
 * LA TABLA F — los huecos entre el móvil y el servidor.
 *
 * Todo lo de aquí sale de mirar qué pasa MIENTRAS: mientras un envío está en
 * vuelo, mientras el jugador decide, mientras se cambia de partida. Son los
 * casos que no se ven leyendo el camino feliz de arriba abajo.
 */
const rechazoF = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('useQuickMatchScoring · lo que pasa mientras (FE #515, tabla F)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGolfCourseUseCase.execute.mockResolvedValue({ holes: [], tees: [], name: 'Campo' });
    getQuickMatchUseCase.execute.mockResolvedValue(mockQuickMatch);
    offlineQueue.getByMatch.mockReturnValue([]);
    offlineQueue.size.mockReturnValue(0);
    submitQuickMatchHoleScoreUseCase.execute.mockResolvedValue({});
    submitQuickMatchProxyHoleScoreUseCase.execute.mockResolvedValue({});
  });

  const pendiente = (holeNumber, score, participantId = 'user-1') =>
    ({ matchId: 'qm-1', holeNumber, participantId, scoreData: { score } });

  const conAnotacionDe = (score, holeNumber = 7) => ({
    ...mockQuickMatch,
    holeScores: [{ holeNumber, participantId: 'user-1', score, recordedByParticipantId: 'user-2' }],
  });

  const montaCon = async (pendientes, partida = mockQuickMatch) => {
    offlineQueue.getByMatch.mockReturnValue(pendientes);
    getQuickMatchUseCase.execute.mockResolvedValue(partida);
    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    return result;
  };

  it('al enviar lo guardado vuelve a pedir la partida, para que el golpe no se esfume', async () => {
    // Se quita de la cola, pero la foto que hay en memoria es de ANTES del
    // envío y no lo trae: sin volver a pedirla, la casilla vuelve a decir
    // «Anotar» durante diez segundos y el jugador anota el mismo hoyo dos veces
    await montaCon([pendiente(7, 5)]);

    await waitFor(() => expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalled());
    await waitFor(() => expect(getQuickMatchUseCase.execute).toHaveBeenCalledTimes(2));
  });

  it('y no se queda dando vueltas: pedir la partida no vuelve a vaciar', async () => {
    // El vaciado lo dispara el sondeo, y aquí el vaciado pide otro sondeo: sin
    // el cerrojo puesto, cada envío pediría otra partida, sin fin
    await montaCon([pendiente(7, 5)]);

    await waitFor(() => expect(getQuickMatchUseCase.execute).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 60));
    expect(getQuickMatchUseCase.execute).toHaveBeenCalledTimes(2);
    expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('si no se envió nada, no pide la partida otra vez', async () => {
    // Un vaciado que solo encuentra conflictos no ha cambiado nada en el
    // servidor: volver a pedirla es una petición de más en cada sondeo
    await montaCon([pendiente(7, 5)], conAnotacionDe(6));

    await new Promise((r) => setTimeout(r, 60));
    expect(getQuickMatchUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('un envío atascado no se lleva por delante el conflicto de otro hoyo', async () => {
    // El aviso está abierto y el jugador leyéndolo. Si los conflictos se
    // calcularan sobre la marcha, cortar el bucle antes de llegar al hoyo en
    // disputa lo borraría de la lista y el aviso se cerraría solo
    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValue(rechazoF(429));

    const result = await montaCon(
      [pendiente(1, 4), pendiente(7, 5)],
      conAnotacionDe(6)
    );

    await waitFor(() => expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalled());
    expect(result.current.discrepancias).toHaveLength(1);
    expect(result.current.discrepancias[0].holeNumber).toBe(7);
  });

  it('lo que el jugador resuelve mientras se envía otra cosa no se deshace', async () => {
    // El bucle trabaja sobre la foto de la cola de cuando empezó. Si no la
    // relee, manda un golpe que el jugador acaba de descartar
    let suelta;
    submitQuickMatchHoleScoreUseCase.execute.mockImplementationOnce(
      () => new Promise((r) => { suelta = r; })
    );

    const result = await montaCon([pendiente(1, 4), pendiente(7, 5)]);
    await waitFor(() => expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledTimes(1));

    // El jugador descarta el hoyo 7 mientras el 1 sigue en vuelo
    offlineQueue.getByMatch.mockReturnValue([pendiente(1, 4)]);
    await act(async () => {
      result.current.resuelveDiscrepancia(7, 'user-1', 'elQueHay');
      suelta?.({});
    });

    expect(submitQuickMatchHoleScoreUseCase.execute).not.toHaveBeenCalledWith('qm-1', 7, 5);
  });

  it('el aviso de un hoyo perdido no se repite dos veces', async () => {
    // «Los hoyos 7, 7 no se pudieron guardar» es lo que sale si se apila sin
    // mirar si ya estaba
    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValue(rechazoF(409));

    const result = await montaCon([pendiente(7, 5)]);
    await waitFor(() => expect(result.current.perdidos).toHaveLength(1));

    await act(async () => { await result.current.refetch(); });

    expect(result.current.perdidos).toHaveLength(1);
  });

  it('al reanotar un hoyo perdido, el aviso se va aunque tampoco llegue', async () => {
    // El aviso pide volver a anotarlo. Si al hacerlo el golpe se queda otra vez
    // en el móvil, sigue habiendo anotación: lo que ya no hay es nada perdido
    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValueOnce(rechazoF(409));

    const result = await montaCon([pendiente(7, 5)]);
    await waitFor(() => expect(result.current.perdidos).toHaveLength(1));

    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));
    await act(async () => { await result.current.submitScore(7, 'user-1', 6); });

    expect(result.current.perdidos).toEqual([]);
  });

  it('al cambiar de partida no se arrastra lo de la anterior', async () => {
    // La ruta no lleva `key`, así que ir de una partida a otra reutiliza el
    // hook: sin limpiar, el aviso rojo y el conflicto de la partida de antes se
    // quedan en pantalla contra los hoyos de la nueva
    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValue(rechazoF(409));
    offlineQueue.getByMatch.mockReturnValue([pendiente(7, 5)]);

    const { result, rerender } = renderHook(({ id }) => useQuickMatchScoring(id, 'user-1'), {
      initialProps: { id: 'qm-1' },
    });
    await waitFor(() => expect(result.current.perdidos).toHaveLength(1));

    offlineQueue.getByMatch.mockReturnValue([]);
    offlineQueue.size.mockReturnValue(0);
    rerender({ id: 'qm-2' });

    await waitFor(() => expect(result.current.perdidos).toEqual([]));
    expect(result.current.discrepancias).toEqual([]);
    expect(result.current.pendientes).toBe(0);
  });
});

describe('useQuickMatchScoring · lo guardado se ve (FE #515, tabla E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGolfCourseUseCase.execute.mockResolvedValue({ holes: [], tees: [], name: 'Campo' });
    getQuickMatchUseCase.execute.mockResolvedValue(mockQuickMatch);
    offlineQueue.getByMatch.mockReturnValue([]);
    submitQuickMatchHoleScoreUseCase.execute.mockResolvedValue({});
    submitQuickMatchProxyHoleScoreUseCase.execute.mockResolvedValue({});
  });

  const conAnotacionDe = (score) => ({
    ...mockQuickMatch,
    holeScores: [{ holeNumber: 7, participantId: 'user-1', score, recordedByParticipantId: 'user-2' }],
  });

  const pendiente = (holeNumber, score, participantId = 'user-1') =>
    ({ matchId: 'qm-1', holeNumber, participantId, scoreData: { score } });

  const montaCon = async (pendientes, partida = mockQuickMatch) => {
    offlineQueue.getByMatch.mockReturnValue(pendientes);
    getQuickMatchUseCase.execute.mockResolvedValue(partida);
    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    return result;
  };

  it('un hoyo que solo está en el móvil sale en la lista que se pinta', async () => {
    // Aquí el envío no llega: la entrada se queda en la cola, que es el caso
    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await montaCon([pendiente(7, 5)]);

    expect(result.current.holeScoresVisibles).toContainEqual(
      expect.objectContaining({ holeNumber: 7, participantId: 'user-1', score: 5 })
    );
  });

  it('una bola recogida guardada en el móvil también se ve', async () => {
    // `null` no es «no hay anotación»: es la raya, y significa lo contrario
    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await montaCon([pendiente(7, null)]);

    expect(result.current.holeScoresVisibles).toContainEqual(
      expect.objectContaining({ holeNumber: 7, participantId: 'user-1', score: null })
    );
  });

  it('en disputa manda el del servidor hasta que el jugador decida', async () => {
    const result = await montaCon([pendiente(7, 5)], conAnotacionDe(6));

    const fila = result.current.holeScoresVisibles.find((hs) => hs.holeNumber === 7);
    expect(fila.score).toBe(6);
    expect(result.current.holeScoresVisibles.filter((hs) => hs.holeNumber === 7)).toHaveLength(1);
  });

  it('en cuanto decide que vale el suyo, es el suyo el que se ve', async () => {
    const decidida = { ...pendiente(7, 5), scoreData: { score: 5, decidido: true } };
    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await montaCon([decidida], conAnotacionDe(6));

    expect(result.current.holeScoresVisibles.find((hs) => hs.holeNumber === 7).score).toBe(5);
  });

  it('sin nada guardado, es exactamente lo que dice el servidor', async () => {
    const result = await montaCon([], conAnotacionDe(6));
    expect(result.current.holeScoresVisibles).toEqual(conAnotacionDe(6).holeScores);
  });
});

/**
 * LA TABLA G — cuando lo guardado y lo enviado hablan del MISMO hoyo.
 *
 * La cola guarda una anotación por hoyo y jugador, y el envío directo escribe
 * sobre ese mismo hoyo. Cuando los dos caminos se cruzan, gana el último que
 * el jugador hizo: cualquier otra cosa le devuelve un resultado que ya había
 * corregido, y encima preguntándoselo con su propio nombre.
 *
 *   caso                                    | qué pasa
 *   ----------------------------------------|-------------------------------
 *   corrijo un hoyo que tenía guardado y     | lo guardado sobra y se tira: el
 *   esta vez sí llega                        | servidor ya tiene lo bueno
 *   lo reanoto mientras se envía lo de antes | al acabar el envío viejo no se
 *                                            | borra lo nuevo
 *   el móvil no puede guardar                | se dice en rojo; el golpe no
 *                                            | desaparece en silencio
 *   resuelvo y la entrada ya no está         | el aviso se cierra igual
 */
describe('useQuickMatchScoring · lo guardado y lo enviado, mismo hoyo (FE #515, tabla G)', () => {
  // Aquí la cola guarda de verdad. Con los mocks inertes de los otros bloques,
  // un `remove` que no quita nada deja pasar justo los defectos de este grupo:
  // el efecto que se comprueba es que lo borrado deje de salir
  let cola;
  const mismo = (e, hoyo, quien) => e.holeNumber === hoyo && e.participantId === quien;

  beforeEach(() => {
    vi.clearAllMocks();
    cola = [];
    offlineQueue.getByMatch.mockImplementation(() => cola);
    offlineQueue.size.mockImplementation(() => cola.length);
    offlineQueue.enqueue.mockImplementation((matchId, holeNumber, scoreData, participantId) => {
      cola = cola.filter((e) => !mismo(e, holeNumber, participantId));
      cola.push({ matchId, holeNumber, participantId, scoreData });
      return true;
    });
    offlineQueue.remove.mockImplementation((matchId, holeNumber, participantId) => {
      cola = cola.filter((e) => !mismo(e, holeNumber, participantId));
      return true;
    });
    getGolfCourseUseCase.execute.mockResolvedValue({ holes: [], tees: [], name: 'Campo' });
    getQuickMatchUseCase.execute.mockResolvedValue(mockQuickMatch);
    submitQuickMatchHoleScoreUseCase.execute.mockResolvedValue({});
    submitQuickMatchProxyHoleScoreUseCase.execute.mockResolvedValue({});
  });

  const pendiente = (holeNumber, score, participantId = 'user-1') =>
    ({ matchId: 'qm-1', holeNumber, participantId, scoreData: { score } });

  const monta = async () => {
    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    return result;
  };

  it('corregir un hoyo que estaba guardado tira lo guardado', async () => {
    // Tal y como pasa: el jugador ya está en la pantalla, anota sin cobertura
    // —el golpe se queda en el móvil— y corrige ese mismo hoyo cuando vuelve.
    // Si lo viejo no se tira, el siguiente vaciado lo manda y PISA la
    // corrección en el servidor; y si el servidor ya la tuviera, le preguntaría
    // al jugador si quiere recuperar el resultado que él mismo corrigió, con su
    // propio nombre al lado
    const result = await monta();

    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await act(async () => { await result.current.submitScore(5, 'user-1', 4); });
    expect(cola).toHaveLength(1);
    // El intento de antes también fue con un 4, y era legítimo: lo que no
    // puede volver a salir es el reenvío de lo guardado
    submitQuickMatchHoleScoreUseCase.execute.mockClear();

    await act(async () => { await result.current.submitScore(5, 'user-1', 6); });

    await waitFor(() => expect(cola).toHaveLength(0));
    expect(submitQuickMatchHoleScoreUseCase.execute).not.toHaveBeenCalledWith('qm-1', 5, 4);
    expect(result.current.discrepancias).toHaveLength(0);
  });

  it('el envío que acaba no borra una anotación más nueva del mismo hoyo', async () => {
    // Mientras el golpe viejo está en vuelo, el jugador reanota ese hoyo y
    // tampoco llega: lo nuevo entra en la cola. Borrar «el hoyo 5» a secas se
    // lleva por delante la corrección, y el servidor se queda con lo viejo
    let suelta;
    submitQuickMatchHoleScoreUseCase.execute.mockImplementationOnce(
      () => new Promise((r) => { suelta = r; })
    );
    cola = [pendiente(5, 4)];

    await monta();
    await waitFor(() => expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledTimes(1));

    cola = [pendiente(5, 6)];
    await act(async () => { suelta?.({}); });

    expect(cola).toContainEqual(expect.objectContaining({ holeNumber: 5, scoreData: { score: 6 } }));
  });

  it('si el móvil no puede guardar el golpe, se dice', async () => {
    // En un iPhone sin espacio, o en una ventana privada, `localStorage` se
    // niega. Callarlo es lo peor de todo: ni recuadro rojo ni aviso ámbar, y
    // el golpe desaparecido
    offlineQueue.enqueue.mockReturnValue(false);
    submitQuickMatchHoleScoreUseCase.execute.mockRejectedValue(new TypeError('Failed to fetch'));


    const result = await monta();
    await act(async () => { await result.current.submitScore(5, 'user-1', 4); });

    expect(result.current.saveError).toBeTruthy();
  });

  it('resolver un conflicto cuya entrada ya no está cierra el aviso igual', async () => {
    // Si no, el velo se queda encima para siempre: no se puede anotar, ni
    // terminar, ni cancelar, y recargar devuelve al mismo sitio
    const conAnotacion = {
      ...mockQuickMatch,
      holeScores: [{ holeNumber: 7, participantId: 'user-1', score: 6, recordedByParticipantId: 'user-2' }],
    };
    getQuickMatchUseCase.execute.mockResolvedValue(conAnotacion);
    cola = [pendiente(7, 5)];

    const result = await monta();
    await waitFor(() => expect(result.current.discrepancias).toHaveLength(1));

    cola = [];
    await act(async () => { result.current.resuelveDiscrepancia(7, 'user-1', 'mio'); });

    expect(result.current.discrepancias).toHaveLength(0);
  });
});

/**
 * LA TABLA H — nunca dos escrituras a la vez sobre el mismo hoyo.
 *
 * El vaciado y el envío directo escriben en el mismo sitio, y el orden de
 * llegada no lo decide nadie: si el golpe viejo sale primero y llega el
 * último, el servidor se queda con el viejo y la corrección no está en ninguna
 * parte —ni en la cola, que ya se vació, ni en el servidor—. Con un solo
 * cerrojo para las dos, el orden deja de importar porque no se solapan.
 *
 *   caso                          | qué pasa
 *   ------------------------------|-----------------------------------------
 *   anoto mientras se vacía       | el golpe se guarda; sale en el siguiente
 *                                 | sondeo, detrás de lo que ya iba
 *   llega un sondeo mientras       | el vaciado no arranca; lo hará el
 *   estoy anotando                | siguiente
 */
describe('useQuickMatchScoring · una escritura cada vez (FE #515, tabla H)', () => {
  let cola;
  const mismo = (e, hoyo, quien) => e.holeNumber === hoyo && e.participantId === quien;

  beforeEach(() => {
    vi.clearAllMocks();
    cola = [];
    offlineQueue.getByMatch.mockImplementation(() => cola);
    offlineQueue.size.mockImplementation(() => cola.length);
    offlineQueue.enqueue.mockImplementation((matchId, holeNumber, scoreData, participantId) => {
      cola = cola.filter((e) => !mismo(e, holeNumber, participantId));
      cola.push({ matchId, holeNumber, participantId, scoreData });
      return true;
    });
    offlineQueue.remove.mockImplementation((matchId, holeNumber, participantId) => {
      cola = cola.filter((e) => !mismo(e, holeNumber, participantId));
      return true;
    });
    getGolfCourseUseCase.execute.mockResolvedValue({ holes: [], tees: [], name: 'Campo' });
    getQuickMatchUseCase.execute.mockResolvedValue(mockQuickMatch);
    submitQuickMatchHoleScoreUseCase.execute.mockResolvedValue({});
    submitQuickMatchProxyHoleScoreUseCase.execute.mockResolvedValue({});
  });

  it('anotar mientras se vacía guarda el golpe en vez de mandarlo', async () => {
    // Mandarlo abre justo la carrera: el 4 ya está en vuelo, y si el 6 llega
    // antes, el servidor se queda con el 4 y del 6 no queda ni rastro
    let suelta;
    submitQuickMatchHoleScoreUseCase.execute.mockImplementationOnce(
      () => new Promise((r) => { suelta = r; })
    );
    cola = [{ matchId: 'qm-1', holeNumber: 5, participantId: 'user-1', scoreData: { score: 4 } }];

    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledTimes(1));

    await act(async () => { await result.current.submitScore(5, 'user-1', 6); });

    expect(submitQuickMatchHoleScoreUseCase.execute).toHaveBeenCalledTimes(1);
    expect(cola).toContainEqual(expect.objectContaining({ holeNumber: 5, scoreData: { score: 6 } }));
    expect(result.current.saveError).toBeNull();

    suelta?.({});
  });

  it('el vaciado no arranca si hay un golpe en vuelo', async () => {
    let suelta;
    const { result } = renderHook(() => useQuickMatchScoring('qm-1', 'user-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    submitQuickMatchHoleScoreUseCase.execute.mockImplementationOnce(
      () => new Promise((r) => { suelta = r; })
    );
    let anotando;
    act(() => { anotando = result.current.submitScore(5, 'user-1', 6); });

    // Con el golpe en vuelo entra un sondeo y encuentra otra cosa guardada
    cola = [{ matchId: 'qm-1', holeNumber: 8, participantId: 'user-1', scoreData: { score: 3 } }];
    await act(async () => { await result.current.refetch(); });

    expect(submitQuickMatchHoleScoreUseCase.execute).not.toHaveBeenCalledWith('qm-1', 8, 3);

    await act(async () => { suelta?.({}); await anotando; });
  });
});
