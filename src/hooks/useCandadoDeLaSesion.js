import { useState, useEffect, useCallback, useRef } from 'react';
import * as sessionLock from '../utils/scoringSessionLock';

const SESSION_REFRESH_INTERVAL = 30000; // 30 seconds

/**
 * El candado de la sesión de anotación de competición, de `useScoring`: una
 * sola pantalla anotando por cuenta. El identificador de la sesión es del hook
 * que lo usa y llega en `sessionIdRef`.
 *
 * Tiene un efecto: quien lo llama decide en qué punto de sus efectos corre.
 */
export const useCandadoDeLaSesion = ({ matchId, currentUserId, isMatchPlayer, isWithdrawn, sessionIdRef }) => {
  const [isSessionBlocked, setIsSessionBlocked] = useState(false);
  const sessionRefreshRef = useRef(null);

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
      // And only the scoring-screen lock: the same user also holds a scoped
      // one for the background queue drain, which has nothing to block here
      if (event.scope) return;

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
  }, [matchId, isMatchPlayer, isWithdrawn, currentUserId, sessionIdRef]);

  return { isSessionBlocked, takeOverSession };
};
