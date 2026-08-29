import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getScoringViewUseCase,
  submitHoleScoreUseCase,
  submitScorecardUseCase,
  concedeMatchUseCase,
} from '../composition';
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

    if (isOffline) {
      offlineQueue.enqueue(matchId, holeNumber, scoreData);
      setPendingQueueSize(offlineQueue.size(matchId));
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
    } catch (err) {
      const status = err?.response?.status ?? err?.status;
      const isRetryable = !status || status >= 500;
      if (isRetryable) {
        offlineQueue.enqueue(matchId, holeNumber, scoreData);
        setPendingQueueSize(offlineQueue.size(matchId));
      }
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [matchId, canScore, isOwnScoreLocked, isMarkerScoreLocked, isOffline]);

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
  const processQueue = useCallback(async () => {
    const entries = offlineQueue.getByMatch(matchId);
    for (const entry of entries) {
      try {
        await submitHoleScoreUseCase.execute(entry.matchId, entry.holeNumber, entry.scoreData);
        // Con el participante: `remove` distingue por él desde FE #515, así que
        // omitirlo dejaría sin borrar cualquier entrada que lo lleve, y se
        // reenviaría en cada reconexión sin que la cuenta bajara nunca
        offlineQueue.remove(entry.matchId, entry.holeNumber, entry.participantId);
      } catch (err) {
        const status = err?.response?.status ?? err?.status;
        if (status && status >= 400 && status < 500) {
          // Non-retryable client error — discard and continue
          offlineQueue.remove(entry.matchId, entry.holeNumber, entry.participantId);
          continue;
        }
        break; // Stop on network or server error
      }
    }
    setPendingQueueSize(offlineQueue.size(matchId));
    await fetchScoringView();
  }, [matchId, fetchScoringView]);

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

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
    setPendingQueueSize(offlineQueue.size(matchId));
  }, [matchId]);

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
