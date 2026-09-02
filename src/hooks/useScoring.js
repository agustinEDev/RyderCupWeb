import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getScoringViewUseCase,
  submitHoleScoreUseCase,
  submitScorecardUseCase,
  concedeMatchUseCase,
} from '../composition';
import { seGuardaParaDespues } from '../utils/politicaDeLaCola';
import { vaciaAnotaciones } from '../services/vaciaAnotaciones';
import * as golpesPerdidos from '../utils/golpesPerdidos';
import * as offlineQueue from '../utils/scoringOfflineQueue';
import * as sessionLock from '../utils/scoringSessionLock';

const POLL_INTERVAL = 10000; // 10 seconds
const SESSION_REFRESH_INTERVAL = 30000; // 30 seconds

/**
 * Central hook for live scoring.
 * Manages scoring state, polling, auto-save, offline queue, and session lock.
 *
 * @param {string} matchId
 * @param {string} currentUserId
 * @returns {Object} Scoring state and actions
 */
/**
 * El aviso de que el móvil no pudo guardar el golpe. Sin espacio o en una
 * ventana privada, el golpe no está en el servidor NI en el dispositivo.
 */
const errorDeGuardado = (holeNumber) => {
  const fallo = new Error('No se pudo guardar el golpe en el móvil');
  fallo.holeNumber = holeNumber;
  fallo.noSeGuardo = true;
  return fallo;
};

export const useScoring = (matchId, currentUserId, isAdmin = false) => {
  const [scoringView, setScoringView] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchSummary, setMatchSummary] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSessionBlocked, setIsSessionBlocked] = useState(false);
  const [pendingQueueSize, setPendingQueueSize] = useState(0);

  // eslint-disable-next-line react-hooks/purity -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
  const sessionIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const pollIntervalRef = useRef(null);
  const sessionRefreshRef = useRef(null);

  // Determine if user is a player in this match
  const isMatchPlayer = scoringView?.players?.some(p => p.userId === currentUserId) ?? false;

  // Admins can score any match even if not enrolled as a player
  const canScore = isMatchPlayer || isAdmin;

  // Determine if scorecard already submitted by current user
  const hasSubmitted = scoringView?.scorecardSubmittedBy?.includes(currentUserId) ?? false;

  // Find the current user's marker assignment
  const myAssignment = scoringView?.markerAssignments?.find(
    ma => ma.scorerUserId === currentUserId
  );

  // Who do I mark (to check if the person I mark has submitted)
  const markedPlayerId = myAssignment?.marksUserId;
  const markedPlayerHasSubmitted = markedPlayerId
    ? (scoringView?.scorecardSubmittedBy?.includes(markedPlayerId) ?? false)
    : false;

  // Own scores locked after I submit my scorecard
  const isOwnScoreLocked = hasSubmitted;

  // Marker scores locked only when the person I mark has submitted their scorecard
  const isMarkerScoreLocked = markedPlayerHasSubmitted;

  // Fully locked = both my own scores and marker scores are locked.
  // Must use markedPlayerHasSubmitted (the player I mark), not whoever marks ME —
  // in FOURBALL/FOURSOMES marking is a non-reciprocal 4-cycle (A1 marks B1, but is
  // marked by B2), so those are different people and mixing them up read-only-locks
  // the whole input as soon as MY marker submits, even while the player I still mark
  // has an unresolved discrepancy — leaving no one able to fix it.
  const isFullyLocked = isOwnScoreLocked && isMarkerScoreLocked;

  // My line on every hole, in hole order
  const myHoleScores = scoringView?.scores?.map(
    s => s.playerScores?.find(ps => ps.userId === currentUserId)
  ) ?? [];

  // Count validated holes
  const validatedHoles = myHoleScores.filter(ps => ps?.validationStatus === 'match').length;

  // A hole counts as played when EITHER side has put a score on my line: a
  // decided match leaves the rest unplayed on purpose, but a hole my marker
  // scored and I did not is a hole I still owe. Reading `ownSubmitted` alone
  // hid exactly that hole — and once the card is in, `isOwnScoreLocked` makes
  // the input read-only and the API drops a late own score without an error
  // (`submit_hole_score_use_case.py`, `if not own_score_locked`), so the hole
  // would be lost for good and fall out of the match result.
  const playedHoles = myHoleScores.filter(ps => ps?.ownSubmitted || ps?.markerSubmitted);
  const everyPlayedHoleValidated =
    playedHoles.length > 0 && playedHoles.every(ps => ps.validationStatus === 'match');

  // Always allow navigating all 18 holes, even if match decided early
  const totalHoles = 18;

  // A match play match ends as soon as one side is more holes up than there are
  // holes left, and the backend accepts that card: SubmitScorecardUseCase only
  // requires the holes that WERE played to be validated. Asking for all 18 here
  // left the "Partido Decidido" dialog offering a "Continuar para Enviar"
  // button with nothing behind it, so a decided match could never be signed off
  // by its players.
  const canSubmitScorecard =
    canScore &&
    !hasSubmitted &&
    (scoringView?.isDecided ? everyPlayedHoleValidated : validatedHoles >= totalHoles);

  // What the confirmation dialog counts against: in a decided match the card is
  // complete at the hole it ended on, so "12/18" would read as unfinished
  const holesToSubmit = scoringView?.isDecided ? playedHoles.length : totalHoles;

  // --- Fetch scoring view ---
  /**
   * Cuántas anotaciones de esta partida quedan por enviar, contando solo las
   * que este vaciado sabe mandar: las que llevan participante son de una
   * partida rápida y aquí se dejan estar, así que contarlas dejaba el número
   * en algo distinto de cero para siempre (FE #515).
   */
  /**
   * Cómo se identifica esta partida en el aviso de golpes sin enviar (FE #521).
   *
   * El campo Y el número, porque una jornada juega varios partidos en el mismo
   * campo: solo con el nombre del campo el panel enseña dos avisos idénticos.
   * Van como datos crudos y los redacta la traducción — componer aquí un
   * «Partido 3 · La Herrería» congelaría texto español en el almacenamiento,
   * y seguiría en español para quien tenga la aplicación en inglés.
   *
   * Se guarda en una ref y no se deriva de `scoringView`: el sondeo lo
   * reemplaza cada 10 s, y colgar de él un `useCallback` reconstruía
   * `submitScore` seis veces por minuto en la pantalla más caliente.
   */
  const laPartidaRef = useRef({ matchName: null, matchNumber: null });
  useEffect(() => {
    laPartidaRef.current = {
      matchName: scoringView?.roundInfo?.golfCourseName ?? null,
      matchNumber: scoringView?.matchNumber ?? null,
    };
    // Y se le pone nombre a lo que se guardó sin él: en un arranque en frío
    // sin cobertura esta vista no llega nunca, así que todo lo anotado ese día
    // quedó sin nombre y el panel enseñaba «una partida anterior». En cuanto
    // la vista carga, aunque sea al día siguiente, se rellena (FE #551)
    if (matchId && (laPartidaRef.current.matchName || laPartidaRef.current.matchNumber != null)) {
      offlineQueue.ponleNombre(matchId, laPartidaRef.current);
    }
  }, [matchId, scoringView?.roundInfo?.golfCourseName, scoringView?.matchNumber]);

  const pendientesPropias = useCallback(
    () => offlineQueue.getByMatch(matchId, currentUserId).filter((e) => e.participantId == null).length,
    [matchId, currentUserId]
  );

  const fetchScoringView = useCallback(async () => {
    if (!matchId) return;
    try {
      const data = await getScoringViewUseCase.execute(matchId);
      setScoringView(data);
      setError(null);
    } catch (err) {
      if (!isOffline) {
        setError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [matchId, isOffline]);

  // --- Submit hole score ---
  // Allow submission if own scores OR marker scores are still editable
  const submitScore = useCallback(async (holeNumber, scoreData) => {
    if (!matchId || !canScore) return;
    if (isOwnScoreLocked && isMarkerScoreLocked) return;

    // El aviso de «no se pudo guardar» de este hoyo se retira, pero SOLO
    // cuando el reemplazo está a salvo: enviado, o guardado en la cola. Se
    // hacía aquí arriba y era un error — si el reemplazo lo rechazan también,
    // o el móvil no tiene sitio para encolarlo, el jugador se quedaba sin
    // golpe Y sin aviso, que es justo lo que esta issue existe para impedir
    const yaNoSePierde = () => golpesPerdidos.olvidaEl(matchId, holeNumber, currentUserId);

    if (isOffline) {
      const guardado = offlineQueue.enqueue(
        matchId,
        holeNumber,
        scoreData,
        null,
        currentUserId,
        laPartidaRef.current
      );
      setPendingQueueSize(pendientesPropias());
      if (guardado === false) {
        // Sin cobertura Y sin sitio donde guardarlo: el golpe no existe en
        // ninguna parte, y eso hay que decirlo
        setError(errorDeGuardado(holeNumber));
      } else {
        // Y se retira el aviso anterior si lo había: sin esto, un hoyo que no
        // se pudo guardar dejaba el cartel puesto el RESTO de la vuelta,
        // mientras los siguientes se guardaban bien. Sin cobertura no hay
        // ninguna otra ocasión de limpiarlo —el sondeo no corre—, así que el
        // jugador reanotaba hoyos creyendo que no se estaban guardando
        setError(null);
        yaNoSePierde();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedView = await submitHoleScoreUseCase.execute(matchId, holeNumber, scoreData);
      // Preserve holes data if the submit response returns empty holes (backend bug resilience)
      setScoringView(prev => ({
        ...updatedView,
        holes: updatedView.holes?.length > 0 ? updatedView.holes : (prev?.holes || []),
      }));
      setError(null);
      yaNoSePierde();
    } catch (err) {
      // La misma política que el resto de la aplicación: un 401, un 408 o un
      // 429 NO son culpa del golpe y se guardan. Antes aquí solo se guardaba a
      // partir del 500, así que una sesión caducada tiraba la anotación
      if (seGuardaParaDespues(err)) {
        const guardado = offlineQueue.enqueue(
          matchId,
          holeNumber,
          scoreData,
          null,
          currentUserId,
          laPartidaRef.current
        );
        setPendingQueueSize(pendientesPropias());
        // Si el móvil no pudo guardarla —sin espacio, ventana privada— hay que
        // decirlo: callarlo deja al jugador creyendo que su golpe está a salvo
        // en algún sitio, y no está en ninguno
        setError(guardado === false ? errorDeGuardado(holeNumber) : null);
        if (guardado !== false) yaNoSePierde();
        // Y si SÍ se guardó, no se enseña error: para el jugador el golpe está
        // anotado, solo que todavía no ha salido del móvil. Decirle que ha
        // fallado le hace reanotarlo, que es como se anota dos veces el mismo
        // hoyo. Es lo que ya hacía la pantalla de partida rápida
        return;
      }
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [matchId, canScore, isOwnScoreLocked, isMarkerScoreLocked, isOffline, pendientesPropias, currentUserId]);

  // --- Submit scorecard ---
  const submitScorecard = useCallback(async () => {
    if (!matchId || !canSubmitScorecard) return;

    setIsSubmitting(true);
    try {
      const summary = await submitScorecardUseCase.execute(matchId);
      setMatchSummary(summary);
      setError(null);
      // Refresh view to get updated submittedBy
      await fetchScoringView();
    } catch (err) {
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [matchId, canSubmitScorecard, fetchScoringView]);

  // --- Concede match ---
  const concedeMatch = useCallback(async (concedingTeam, reason) => {
    if (!matchId) return;

    setIsSubmitting(true);
    try {
      await concedeMatchUseCase.execute(matchId, concedingTeam, reason);
      await fetchScoringView();
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [matchId, fetchScoringView]);

  // --- Process offline queue ---
  const vaciaLaDeEstaPartida = useCallback(async () => {
    // La política —qué se manda, qué se aparta, qué para el bucle— vive en un
    // solo sitio (FE #551). Aquí solo se dice CUÁLES son las de esta pantalla
    // y CÓMO se mandan. Cuando esto era una copia del bucle, le faltaban dos
    // guardas que el de fondo sí tenía, y perdía correcciones del jugador
    await vaciaAnotaciones({
      entradas: offlineQueue.getByMatch(matchId, currentUserId),
      manda: (entrada) =>
        submitHoleScoreUseCase.execute(entrada.matchId, entrada.holeNumber, entrada.scoreData),
      // Una anotación con participante es de una partida rápida: va por otro
      // endpoint y con otro cuerpo, así que enviarla desde aquí la guardaría
      // mal y la borraría a continuación (FE #515)
      seSalta: (entrada) => entrada.participantId != null,
    });
    setPendingQueueSize(pendientesPropias());
    await fetchScoringView();
  }, [matchId, fetchScoringView, pendientesPropias, currentUserId]);

  // Un solo vaciado a la vez. Ahora hay tres disparadores —montar, `online` y
  // volver a la aplicación— y llegan juntos: al entrar desde el aviso del
  // panel, el de montar y el de visibilidad caen en el mismo instante. Sin
  // esto, el segundo lee la cola todavía sin vaciar y reenvía los mismos hoyos
  const vaciandoRef = useRef(false);
  const processQueue = useCallback(async () => {
    if (vaciandoRef.current) return;
    vaciandoRef.current = true;
    try {
      await vaciaLaDeEstaPartida();
    } finally {
      vaciandoRef.current = false;
    }
  }, [vaciaLaDeEstaPartida]);



  // --- Take over session (force-acquire lock) ---
  const takeOverSession = useCallback(() => {
    if (!matchId) return;
    sessionLock.forceRelease(currentUserId);
    sessionLock.acquire(matchId, sessionIdRef.current, currentUserId);
    setIsSessionBlocked(false);

    // Start refresh timer for the new lock
    if (sessionRefreshRef.current) clearInterval(sessionRefreshRef.current);
    sessionRefreshRef.current = setInterval(() => {
      sessionLock.refresh(sessionIdRef.current, currentUserId);
    }, SESSION_REFRESH_INTERVAL);
  }, [matchId, currentUserId]);

  // --- Online/offline listeners ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      processQueue();
    };
    const handleOffline = () => setIsOffline(true);
    // iOS no le entrega `online` a una página suspendida: al volver a la
    // aplicación desde el bloqueo, esto es lo único que llega. La pantalla de
    // partida rápida ya lo escuchaba; esta no, y era su gemela sin arreglar
    const alVolver = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) processQueue();
    };

    // Y al entrar: quien llega aquí desde el aviso del panel —«tienes 3 golpes
    // sin enviar»— ya estaba con cobertura, así que `online` no se dispara.
    // Sin esto, seguir la instrucción de ese aviso no enviaba absolutamente
    // nada y la partida quedaba además excluida del vaciado de fondo.
    // Aplazado un tick: así la pantalla pinta antes de empezar a enviar, y no
    // se cambia estado dentro del propio efecto
    if (navigator.onLine) globalThis.queueMicrotask(() => processQueue());

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [processQueue]);

  // --- Session lock (scoped per userId) ---
  useEffect(() => {
    if (!matchId || !isMatchPlayer || !currentUserId) return;

    // Force-release any stale lock before acquiring.
    // Prevents orphaned locks (closed tabs, page reloads, or cookie-shared
    // sessions in same browser) from blocking on mount.
    // Protection is maintained: if another tab is actively open, it receives
    // the LOCK_ACQUIRED event via BroadcastChannel and gets blocked.
    sessionLock.forceRelease(currentUserId);
    sessionLock.acquire(matchId, sessionIdRef.current, currentUserId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    setIsSessionBlocked(false);

    // Refresh lock periodically
    sessionRefreshRef.current = setInterval(() => {
      sessionLock.refresh(sessionIdRef.current, currentUserId);
    }, SESSION_REFRESH_INTERVAL);

    const cleanup = sessionLock.onLockEvent((event) => {
      // Strict filter: only react to events from the SAME user
      // Using !== ensures undefined/null events are also filtered out
      if (event.userId !== currentUserId) return;

      if (event.type === 'LOCK_ACQUIRED' && event.sessionId !== sessionIdRef.current) {
        if (event.matchId === matchId) {
          // Verify against localStorage before blocking (don't trust broadcast alone)
          const existing = sessionLock.getSession(currentUserId);
          if (existing && existing.sessionId !== sessionIdRef.current && existing.matchId === matchId) {
            setIsSessionBlocked(true);
          }
        }
      }
      if (event.type === 'LOCK_RELEASED') {
        const acquired = sessionLock.acquire(matchId, sessionIdRef.current, currentUserId);
        if (acquired) setIsSessionBlocked(false);
      }
    });

    const currentSessionId = sessionIdRef.current;
    const currentRefreshTimer = sessionRefreshRef.current;

    return () => {
      cleanup();
      sessionLock.release(currentSessionId, currentUserId);
      if (currentRefreshTimer) {
        clearInterval(currentRefreshTimer);
      }
    };
  }, [matchId, isMatchPlayer, currentUserId]);

  // --- Initial fetch + polling ---
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    fetchScoringView();

    pollIntervalRef.current = setInterval(() => {
      if (!isOffline) fetchScoringView();
    }, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchScoringView, isOffline]);

  // --- Update pending queue size on mount ---
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing pattern surfaced by eslint-plugin-react-hooks 7.1.1 bump; needs dedicated review (tracked in follow-up)
    setPendingQueueSize(pendientesPropias());
  }, [matchId, pendientesPropias]);

  return {
    // State
    scoringView,
    currentHole,
    isLoading,
    error,
    isSubmitting,
    matchSummary,
    isOffline,
    isSessionBlocked,
    pendingQueueSize,

    // Derived
    isMatchPlayer,
    canScore,
    hasSubmitted,
    isOwnScoreLocked,
    isMarkerScoreLocked,
    isFullyLocked,
    validatedHoles,
    totalHoles,
    holesToSubmit,
    canSubmitScorecard,

    // Actions
    setCurrentHole,
    submitScore,
    submitScorecard,
    concedeMatch,
    takeOverSession,
    refetch: fetchScoringView,
  };
};
