import { useState, useCallback } from 'react';
import {
  conClaveDeRetirada,
  deLaConcesion,
  deLaRetirada,
  deLaTarjeta,
} from '../utils/fallosDeLaAnotacion';

/**
 * Lo que se hace con el partido entero en la anotación de competición, de
 * `useScoring`: entregar la tarjeta, conceder y retirar a un jugador del
 * fourball. Sin efectos.
 */
export const useAccionesDelPartido = ({
  matchId,
  currentUserId,
  canSubmitScorecard,
  entrega,
  concede,
  retira,
  fetchScoringView,
  marcaEscritura,
  esDeOtraPartida,
  pendientesPropias,
  processQueue,
  setFallo,
  setIsSubmitting,
}) => {
  const [matchSummary, setMatchSummary] = useState(null);
  // Retirar no comparte `isSubmitting` con los golpes: un golpe que acaba
  // durante la retirada volvía a habilitar sus botones (/code-review)
  const [retirando, setRetirando] = useState(false);

  // --- Submit scorecard ---
  const submitScorecard = useCallback(async () => {
    if (!matchId || !canSubmitScorecard) return;

    setIsSubmitting(true);
    try {
      const summary = await entrega.execute(matchId);
      // Como un golpe que llega: una vista pedida antes ya no vale (FE #606)
      if (!esDeOtraPartida(matchId)) marcaEscritura();
      setMatchSummary(summary);
      if (!esDeOtraPartida(matchId)) setFallo(null);
      // Refresh view to get updated submittedBy
      await fetchScoringView();
    } catch (err) {
      if (!esDeOtraPartida(matchId)) setFallo(deLaTarjeta(err, matchId));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    matchId,
    canSubmitScorecard,
    fetchScoringView,
    marcaEscritura,
    esDeOtraPartida,
    entrega,
    setFallo,
    setIsSubmitting,
  ]);

  // --- Concede match ---
  const concedeMatch = useCallback(
    async (concedingTeam, reason) => {
      // En stroke play no se concede: su origen no lo trae
      if (!matchId || !concede) return;

      setIsSubmitting(true);
      try {
        await concede.execute(matchId, concedingTeam, reason);
        if (!esDeOtraPartida(matchId)) marcaEscritura();
        await fetchScoringView();
        if (!esDeOtraPartida(matchId)) setFallo(null);
      } catch (err) {
        if (!esDeOtraPartida(matchId)) setFallo(deLaConcesion(err, matchId));
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      matchId,
      fetchScoringView,
      marcaEscritura,
      esDeOtraPartida,
      concede,
      setFallo,
      setIsSubmitting,
    ],
  );

  // --- Retirar a un jugador del fourball, o deshacerlo (RyderCupAM#665) ---
  const retirarJugador = useCallback(
    async (playerId, { deshacer = false } = {}) => {
      // Solo la Ryder: en stroke play se retira por su propio camino
      if (!matchId || !retira) return;
      // No va a la cola: retirar cambia quién marca a quién y lo que cuenta, y
      // aplicarlo tarde y a ciegas sería peor que decir que hace falta red (F8)
      if (!navigator.onLine) {
        setFallo(
          deLaRetirada({ i18nKey: 'withdraw.needsConnection' }, matchId),
        );
        return;
      }
      setRetirando(true);
      try {
        // Retirado, el servidor rechaza para siempre sus golpes (PLAYER_WITHDRAWN):
        // los suyos tienen que salir antes, y si no salen no se le retira
        if (
          !deshacer &&
          playerId === currentUserId &&
          pendientesPropias() > 0
        ) {
          await processQueue();
          if (pendientesPropias() > 0) {
            if (!esDeOtraPartida(matchId))
              setFallo(
                deLaRetirada({ i18nKey: 'withdraw.pendingScores' }, matchId),
              );
            return;
          }
        }
        await retira.execute(matchId, playerId, { deshacer });
        if (!esDeOtraPartida(matchId)) marcaEscritura();
        await fetchScoringView();
        if (!esDeOtraPartida(matchId)) setFallo(null);
      } catch (err) {
        if (!esDeOtraPartida(matchId))
          setFallo(deLaRetirada(conClaveDeRetirada(err), matchId));
      } finally {
        setRetirando(false);
      }
    },
    [
      matchId,
      currentUserId,
      pendientesPropias,
      processQueue,
      fetchScoringView,
      marcaEscritura,
      esDeOtraPartida,
      retira,
      setFallo,
    ],
  );

  return {
    matchSummary,
    retirando,
    submitScorecard,
    concedeMatch,
    retirarJugador,
  };
};
