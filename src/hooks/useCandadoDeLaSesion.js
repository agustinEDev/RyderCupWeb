import { useState, useEffect, useCallback, useRef } from 'react';
import * as sessionLock from '../utils/scoringSessionLock';

const SESSION_REFRESH_INTERVAL = 30000; // 30 seconds

// La clave del candado: un partido y un usuario
const claveDe = (matchId, userId) => JSON.stringify([matchId, userId]);

/**
 * El candado de la sesión de anotación de competición, de `useScoring`: una
 * sola pantalla anotando por cuenta. El identificador de la sesión es del hook
 * que lo usa y llega en `sessionIdRef`.
 *
 * Tiene un efecto: quien lo llama decide en qué punto de sus efectos corre.
 */
export const useCandadoDeLaSesion = ({
  matchId,
  currentUserId,
  isMatchPlayer,
  isWithdrawn,
  sessionIdRef,
}) => {
  // De qué partido y usuario es la pantalla, anote o no
  const identidad = claveDe(matchId, currentUserId);
  // A qué partido y usuario se aplica el candado; null si no se aplica (no
  // juega, se retiró o falta el usuario: no coge el candado)
  const clave =
    matchId && isMatchPlayer && !isWithdrawn && currentUserId
      ? identidad
      : null;
  // «Sesión tomada», con la identidad y la clave a las que se refiere
  const [bloqueo, setBloqueo] = useState({
    identidad,
    clave,
    bloqueada: false,
  });
  // Al pasar a otro partido o usuario (o volver a contar tras retirarse), el
  // bloqueo de antes no vale: se quita ya en este pintado, sin enseñar ni uno
  // con el de antes, aunque en el nuevo tampoco se anote. Solo si el candado
  // deja de aplicarse en el MISMO partido y usuario se queda como estaba (P2:
  // el retirado que ya veía «sesión tomada» la sigue viendo; CodeRabbit, FE #1117)
  const cambia = bloqueo.identidad !== identidad || bloqueo.clave !== clave;
  const conservaElBloqueo = bloqueo.identidad === identidad && clave === null;
  const alDia = cambia
    ? { identidad, clave, bloqueada: conservaElBloqueo && bloqueo.bloqueada }
    : bloqueo;
  if (alDia !== bloqueo) setBloqueo(alDia);
  const isSessionBlocked = alDia.bloqueada;
  const bloquear = (bloqueada) =>
    setBloqueo((antes) => ({ ...antes, bloqueada }));
  const sessionRefreshRef = useRef(null);

  // --- Take over session (force-acquire lock) ---
  const takeOverSession = useCallback(() => {
    if (!matchId) return;
    sessionLock.forceRelease(currentUserId);
    sessionLock.acquire(matchId, sessionIdRef.current, currentUserId);
    bloquear(false);

    // Start refresh timer for the new lock
    if (sessionRefreshRef.current) clearInterval(sessionRefreshRef.current);
    sessionRefreshRef.current = setInterval(() => {
      sessionLock.refresh(sessionIdRef.current, currentUserId);
    }, SESSION_REFRESH_INTERVAL);
  }, [matchId, currentUserId, sessionIdRef]);

  // --- Session lock (scoped per userId) ---
  useEffect(() => {
    // El retirado no anota: no coge el candado (y no le sale «sesión tomada»)
    if (!matchId || !isMatchPlayer || isWithdrawn || !currentUserId) return;

    // Force-release any stale lock before acquiring.
    // Prevents orphaned locks (closed tabs, page reloads, or cookie-shared
    // sessions in same browser) from blocking on mount.
    // Protection is maintained: if another tab is actively open, it receives
    // the LOCK_ACQUIRED event via BroadcastChannel and gets blocked.
    sessionLock.forceRelease(currentUserId);
    sessionLock.acquire(matchId, sessionIdRef.current, currentUserId);
    // El bloqueo de otro partido o usuario ya se quitó al pintar (`clave`).
    // Lo que avise este oyente solo vale mientras la clave siga siendo la
    // suya: tras cambiar de partido sigue suscrito hasta la limpieza, y un
    // aviso del partido anterior en ese hueco bloqueaba (o desbloqueaba) el nuevo
    const claveDelEfecto = claveDe(matchId, currentUserId);
    const bloquearSiSigue = (bloqueada) =>
      setBloqueo((antes) =>
        antes.clave === claveDelEfecto ? { ...antes, bloqueada } : antes,
      );

    // Refresh lock periodically
    sessionRefreshRef.current = setInterval(() => {
      sessionLock.refresh(sessionIdRef.current, currentUserId);
    }, SESSION_REFRESH_INTERVAL);

    const cleanup = sessionLock.onLockEvent((event) => {
      // Strict filter: only react to events from the SAME user
      // Using !== ensures undefined/null events are also filtered out
      if (event.userId !== currentUserId) return;
      // And only the scoring-screen lock: the same user also holds a scoped
      // one for the background queue drain, which has nothing to block here
      if (event.scope) return;

      if (
        event.type === 'LOCK_ACQUIRED' &&
        event.sessionId !== sessionIdRef.current
      ) {
        if (event.matchId === matchId) {
          // Verify against localStorage before blocking (don't trust broadcast alone)
          const existing = sessionLock.getSession(currentUserId);
          if (
            existing &&
            existing.sessionId !== sessionIdRef.current &&
            existing.matchId === matchId
          ) {
            bloquearSiSigue(true);
          }
        }
      }
      if (event.type === 'LOCK_RELEASED') {
        const acquired = sessionLock.acquire(
          matchId,
          sessionIdRef.current,
          currentUserId,
        );
        if (acquired) bloquearSiSigue(false);
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
  }, [matchId, isMatchPlayer, isWithdrawn, currentUserId, sessionIdRef]);

  return { isSessionBlocked, takeOverSession };
};
