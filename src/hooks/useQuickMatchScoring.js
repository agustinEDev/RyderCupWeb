import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getQuickMatchUseCase,
  getGolfCourseUseCase,
  submitQuickMatchHoleScoreUseCase,
  submitQuickMatchProxyHoleScoreUseCase,
  completeQuickMatchUseCase,
  cancelQuickMatchUseCase,
} from '../composition';

const POLL_INTERVAL = 10000; // 10 seconds

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const holesLoadedRef = useRef(false);
  const pollIntervalRef = useRef(null);

  const fetchQuickMatch = useCallback(async () => {
    if (!quickMatchId) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await getQuickMatchUseCase.execute(quickMatchId);
      setQuickMatch(data);
      setLoadError(null);

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
        setSaveError(err);
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
    completeMatch,
    cancelMatch,
    refetch: fetchQuickMatch,
  };
};
