import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getQuickMatchUseCase,
  getGolfCourseUseCase,
  submitQuickMatchHoleScoreUseCase,
  submitQuickMatchProxyHoleScoreUseCase,
  completeQuickMatchUseCase,
  cancelQuickMatchUseCase,
} from '../composition';
import * as offlineQueue from '../utils/scoringOfflineQueue';

const POLL_INTERVAL = 10000; // 10 seconds

/**
 * Rechazos que no mejoran esperando, así que el golpe no se guarda para después.
 *
 * - 404: la partida ya no existe
 * - 403: no eres anotador, o no te toca ese jugador
 * - 409: la partida está terminada o cancelada
 * - 400: el golpe no es válido
 *
 * El 401 NO está: ahí el problema es la sesión, no el golpe, y descartarlo sería
 * tirar una anotación buena por un motivo que se arregla solo.
 */
const NO_MEJORA_ESPERANDO = new Set([400, 403, 404, 409]);

const seGuardaParaDespues = (error) => {
  const estado = error?.status ?? error?.response?.status;
  // Sin estado es que no llegó respuesta: se guarda
  return estado === undefined || !NO_MEJORA_ESPERANDO.has(estado);
};

/**
 * Central hook for quick match scoring: fetches the match + course holes,
 * polls for updates, and exposes score submission (own + delegated).
 *
 * Quick match has no dual-validation, session lock or offline queue — a
 * single scorer records each hole directly, so the hook is intentionally
 * simpler than the tournament useScoring().
 */
export const useQuickMatchScoring = (quickMatchId, currentUserId) => {
  const [quickMatch, setQuickMatch] = useState(null);
  const [holes, setHoles] = useState([]);
  const [tees, setTees] = useState([]);
  const [courseName, setCourseName] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  // Dos errores y no uno: el mismo status significa cosas distintas según de
  // dónde venga. Un 403 al cargar es "no juegas esta partida"; un 403 al anotar
  // es "no eres el anotador de ese jugador". Con un solo estado no había forma
  // de distinguirlos, y mirar si ya había partida en pantalla no vale: el
  // sondeo cada 10 s puede fallar mucho después de que la partida cargara, y
  // `fetchQuickMatch` conserva la anterior a propósito para no vaciar la
  // pantalla por un fallo de red pasajero.
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [pendientes, setPendientes] = useState(0);
  // Hoyos que el servidor rechazó para siempre, para poder decir cuáles fueron
  const [perdidos, setPerdidos] = useState([]);
  // Hoyos donde lo guardado no coincide con lo que hay: los resuelve el jugador
  const [discrepancias, setDiscrepancias] = useState([]);
  const vaciandoRef = useRef(false);
  // El vaciado se declara más abajo y el sondeo está más arriba: la ref evita
  // reordenarlo todo y el ciclo de dependencias entre los dos
  const vaciarRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const holesLoadedRef = useRef(false);
  // Numero de orden del estado: lo toman tanto el sondeo como las acciones que
  // cierran la partida. Un sondeo que salio ANTES del POST podia resolver
  // DESPUES y volver a aplicar su `IN_PROGRESS`, borrando el cierre: la
  // pantalla volvia a dejar anotar y cada guardado se estrellaba con un 409.
  const estadoSeqRef = useRef(0);
  const pollIntervalRef = useRef(null);

  const fetchQuickMatch = useCallback(async () => {
    if (!quickMatchId) {
      setIsLoading(false);
      return;
    }
    const miSeq = ++estadoSeqRef.current;
    try {
      const data = await getQuickMatchUseCase.execute(quickMatchId);
      // Si mientras tanto se cerro la partida —o entro otro sondeo—, esta
      // respuesta ya no es la ultima palabra y aplicarla retrocederia el estado
      if (miSeq !== estadoSeqRef.current) return;
      setQuickMatch(data);
      setLoadError(null);

      // El sondeo ha respondido, así que hay conexión: es el momento de enviar
      // lo que quedó guardado. Se le pasan los hoyos que el servidor ya tiene,
      // que vienen en esta misma respuesta, para poder comparar sin pedir nada
      vaciarRef.current?.(data);

      if (!holesLoadedRef.current) {
        holesLoadedRef.current = true;
        try {
          const course = await getGolfCourseUseCase.execute(data.golfCourseId);
          setHoles(course.holes || []);
          setTees(course.tees || []);
          setCourseName(course.name ?? null);
        } catch {
          holesLoadedRef.current = false;
        }
      }
    } catch (err) {
      setLoadError(err);
    } finally {
      setIsLoading(false);
    }
  }, [quickMatchId]);

  useEffect(() => {
    holesLoadedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch + polling, same pattern as useScoring.js
    fetchQuickMatch();
    pollIntervalRef.current = setInterval(fetchQuickMatch, POLL_INTERVAL);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchQuickMatch]);

  const myParticipant = quickMatch?.participants?.find((p) => p.userId === currentUserId) ?? null;
  const isCreator = quickMatch?.creatorId === currentUserId;
  const isScorer = myParticipant ? quickMatch.scorerIds.includes(myParticipant.participantId) : false;

  const myAssignment = quickMatch?.scoringAssignments?.find(
    (sa) => sa.scorerParticipantId === myParticipant?.participantId
  );
  // The backend's assignment for a scorer already includes themselves in
  // covered_participant_ids (self-coverage), plus any delegated non-scorers.
  const coveredParticipantIds = isScorer
    ? myAssignment?.coveredParticipantIds ?? [myParticipant.participantId]
    : [];

  const totalHoles = holes.length || 18;

  /**
   * Envía un golpe guardado. Devuelve qué hacer con él.
   */
  const enviaGuardado = useCallback(
    async (entrada, miParticipanteId) => {
      const { holeNumber, participantId, scoreData } = entrada;
      try {
        if (participantId === miParticipanteId) {
          await submitQuickMatchHoleScoreUseCase.execute(quickMatchId, holeNumber, scoreData.score);
        } else {
          await submitQuickMatchProxyHoleScoreUseCase.execute(quickMatchId, participantId, holeNumber, scoreData.score);
        }
        return 'enviado';
      } catch (err) {
        // Mismo criterio que al anotar: lo que no mejora esperando se descarta,
        // y lo demás para el vaciado entero para reintentarlo luego
        return seGuardaParaDespues(err) ? 'para' : 'descartar';
      }
    },
    [quickMatchId]
  );

  /**
   * Vacía lo guardado. Lo dispara el sondeo al responder: si responde, hay
   * conexión, y no hace falta deducir un estado global de la red.
   */
  const vaciaLoGuardado = useCallback(
    async (partida) => {
      if (!quickMatchId) return;
      // Todo sale de la respuesta, no del estado: cuando el primer sondeo
      // dispara el vaciado, `quickMatch` todavia es null y `myParticipant`
      // seria null, asi que un golpe propio se enviaria como proxy
      const anotadosEnElServidor = partida?.holeScores;
      const miParticipanteId = partida?.participants?.find(
        (p) => p.userId === currentUserId
      )?.participantId;
      // Una vez a la vez: un golpe no puede enviarse por duplicado
      if (vaciandoRef.current) return;
      vaciandoRef.current = true;

      try {
        const enConflicto = [];
        for (const entrada of offlineQueue.getByMatch(quickMatchId)) {
          const enElServidor = (anotadosEnElServidor ?? []).find(
            (hs) => hs.holeNumber === entrada.holeNumber && hs.participantId === entrada.participantId
          );

          // Ya hay anotación y no coincide: no se envía. La aplicación no sabe
          // quién tiene razón, así que lo decide el jugador
          if (enElServidor && enElServidor.score !== entrada.scoreData.score) {
            enConflicto.push({
              holeNumber: entrada.holeNumber,
              participantId: entrada.participantId,
              mio: entrada.scoreData.score,
              enElServidor: enElServidor.score,
              anotadoPor: enElServidor.recordedByParticipantId,
            });
            continue;
          }

          const queHacer = await enviaGuardado(entrada, miParticipanteId);
          if (queHacer === 'para') break;

          if (queHacer === 'descartar') {
            setPerdidos((antes) => [...antes, { holeNumber: entrada.holeNumber, participantId: entrada.participantId }]);
          }
          offlineQueue.remove(quickMatchId, entrada.holeNumber, entrada.participantId);
        }

        setDiscrepancias(enConflicto);
        setPendientes(offlineQueue.size(quickMatchId));
      } finally {
        vaciandoRef.current = false;
      }
    },
    [quickMatchId, currentUserId, enviaGuardado]
  );

  // La ref se asigna en un efecto, no durante el render. El sondeo la lee
  // despues de su `await`, para entonces este efecto ya ha corrido
  useEffect(() => {
    vaciarRef.current = vaciaLoGuardado;
  }, [vaciaLoGuardado]);

  /**
   * El jugador decide, tras hablar con su compañero, qué anotación vale.
   */
  const resuelveDiscrepancia = useCallback(
    async (holeNumber, participantId, cual) => {
      const entrada = offlineQueue
        .getByMatch(quickMatchId)
        .find((e) => e.holeNumber === holeNumber && e.participantId === participantId);

      if (cual === 'mio' && entrada) {
        const queHacer = await enviaGuardado(entrada, myParticipant?.participantId);
        if (queHacer === 'para') return;
      }

      offlineQueue.remove(quickMatchId, holeNumber, participantId);
      setDiscrepancias((antes) =>
        antes.filter((d) => !(d.holeNumber === holeNumber && d.participantId === participantId))
      );
      setPendientes(offlineQueue.size(quickMatchId));
    },
    [quickMatchId, enviaGuardado, myParticipant]
  );

  const submitScore = useCallback(
    async (holeNumber, participantId, score) => {
      if (!quickMatchId || !isScorer) return;

      setIsSubmitting(true);
      try {
        if (participantId === myParticipant?.participantId) {
          await submitQuickMatchHoleScoreUseCase.execute(quickMatchId, holeNumber, score);
        } else {
          await submitQuickMatchProxyHoleScoreUseCase.execute(quickMatchId, participantId, holeNumber, score);
        }
        setSaveError(null);
        await fetchQuickMatch();
      } catch (err) {
        if (seGuardaParaDespues(err)) {
          // Se guarda en el móvil y NO se enseña error: para el jugador el
          // golpe está anotado, solo que todavía no ha salido de aquí
          offlineQueue.enqueue(quickMatchId, holeNumber, { score }, participantId);
          setPendientes(offlineQueue.size(quickMatchId));
          setSaveError(null);
        } else {
          // El servidor lo rechaza por algo que no cambia con el tiempo. Se
          // dice, y se dice DE QUÉ HOYO: el caso realista es anotar sin
          // cobertura y que alguien termine la partida mientras tanto, y ahí lo
          // menos que se puede hacer es decir cuál se perdió
          err.holeNumber = holeNumber;
          setSaveError(err);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [quickMatchId, isScorer, myParticipant, fetchQuickMatch]
  );

  // Espejo de `completeMatch`: el backend exige creador para las dos
  // (`NotQuickMatchCreatorError`), asi que el boton vive donde el de terminar.
  const cancelMatch = useCallback(async () => {
    if (!quickMatchId || !isCreator) return { ok: false };

    setIsSubmitting(true);
    try {
      // Del DTO que devuelve la accion se toma SOLO el estado: es el DTO base
      // —sin `holeScores`, `standing` ni `participantStrokes`—, y aplicarlo
      // entero borraba la tarjeta y recalculaba el neto con cero golpes, es
      // decir numeros equivocados, no huecos. Se aplica igualmente y no se
      // espera al refetch porque si este falla —se cae la red justo despues
      // del POST— la pantalla seguiria creyendo la partida viva, editable y
      // anotando contra 409 en bucle.
      const actualizada = await cancelQuickMatchUseCase.execute(quickMatchId);
      // Invalida cualquier sondeo en vuelo: su foto es anterior al cierre
      estadoSeqRef.current += 1;
      if (actualizada) {
        setQuickMatch((previa) =>
          previa
            ? {
                ...previa,
                status: actualizada.status,
                isPending: actualizada.isPending,
                isInProgress: actualizada.isInProgress,
                isCompleted: actualizada.isCompleted,
                isCancelled: actualizada.isCancelled,
              }
            : actualizada
        );
      }
      setSaveError(null);
      await fetchQuickMatch();
      return { ok: true };
    } catch (err) {
      // El error NO va a `saveError`: ese banner lo traduce el mapa de errores
      // de anotar —«no se ha podido guardar el resultado»— y se queda pegado
      // hasta el siguiente guardado bueno. Se devuelve para que el dialogo
      // distinga un 409 —ya estaba cerrada— de quedarse sin cobertura.
      return { ok: false, error: err };
    } finally {
      setIsSubmitting(false);
    }
  }, [quickMatchId, isCreator, fetchQuickMatch]);

  const completeMatch = useCallback(async () => {
    if (!quickMatchId || !isCreator) return { ok: false };

    setIsSubmitting(true);
    try {
      // Del DTO que devuelve la accion se toma SOLO el estado: es el DTO base
      // —sin `holeScores`, `standing` ni `participantStrokes`—, y aplicarlo
      // entero borraba la tarjeta y recalculaba el neto con cero golpes, es
      // decir numeros equivocados, no huecos. Se aplica igualmente y no se
      // espera al refetch porque si este falla —se cae la red justo despues
      // del POST— la pantalla seguiria creyendo la partida viva, editable y
      // anotando contra 409 en bucle.
      const actualizada = await completeQuickMatchUseCase.execute(quickMatchId);
      estadoSeqRef.current += 1;
      if (actualizada) {
        setQuickMatch((previa) =>
          previa
            ? {
                ...previa,
                status: actualizada.status,
                isPending: actualizada.isPending,
                isInProgress: actualizada.isInProgress,
                isCompleted: actualizada.isCompleted,
                isCancelled: actualizada.isCancelled,
              }
            : actualizada
        );
      }
      setSaveError(null);
      await fetchQuickMatch();
      return { ok: true };
    } catch (err) {
      // Mismo motivo que en `cancelMatch`: su fallo no es un fallo de anotar.
      return { ok: false, error: err };
    } finally {
      setIsSubmitting(false);
    }
  }, [quickMatchId, isCreator, fetchQuickMatch]);

  return {
    quickMatch,
    holes,
    tees,
    courseName,
    currentHole,
    isLoading,
    loadError,
    saveError,
    isSubmitting,

    myParticipant,
    isCreator,
    isScorer,
    coveredParticipantIds,
    totalHoles,

    setCurrentHole,
    submitScore,
    pendientes,
    perdidos,
    discrepancias,
    resuelveDiscrepancia,
    completeMatch,
    cancelMatch,
    refetch: fetchQuickMatch,
  };
};
