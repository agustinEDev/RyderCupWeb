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
export const useScoring = (matchId, currentUserId) => {
  const [scoringView, setScoringView] = useState(null);
  const [currentHole, setCurrentHole] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchSummary, setMatchSummary] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSessionBlocked, setIsSessionBlocked] = useState(false);
  const [pendingQueueSize, setPendingQueueSize] = useState(0);

  const sessionIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const pollIntervalRef = useRef(null);
  const sessionRefreshRef = useRef(null);

  // Determine if user is a player in this match
  const isMatchPlayer = scoringView?.players?.some(p => p.userId === currentUserId) ?? false;

  // Determine if scorecard already submitted by current user
  const hasSubmitted = scoringView?.scorecardSubmittedBy?.includes(currentUserId) ?? false;

  // Find the current user's marker assignment
  const myAssignment = scoringView?.markerAssignments?.find(
    ma => ma.scorerUserId === currentUserId
  );

  // Who marks ME (to check if my marker has submitted)
  const markerUserId = myAssignment?.markedByUserId;
  const markerHasSubmitted = markerUserId
    ? (scoringView?.scorecardSubmittedBy?.includes(markerUserId) ?? false)
    : false;

  // Who do I mark (to check if the person I mark has submitted)
  const markedPlayerId = myAssignment?.marksUserId;
  const markedPlayerHasSubmitted = markedPlayerId
    ? (scoringView?.scorecardSubmittedBy?.includes(markedPlayerId) ?? false)
    : false;

  // Own scores locked after I submit my scorecard
  const isOwnScoreLocked = hasSubmitted;

  // Marker scores locked only when the person I mark has submitted their scorecard
  const isMarkerScoreLocked = markedPlayerHasSubmitted;

  // Fully locked = both my own scores and marker scores are locked
  const isFullyLocked = hasSubmitted && markerHasSubmitted;

  // Count validated holes
  const validatedHoles = scoringView?.scores?.filter(s => {
    const playerScore = s.playerScores?.find(ps => ps.userId === currentUserId);
    return playerScore?.validationStatus === 'match';
  }).length ?? 0;

  // Always allow navigating all 18 holes, even if match decided early
  const totalHoles = 18;

  const canSubmitScorecard = isMatchPlayer && !hasSubmitted && validatedHoles >= totalHoles;

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
    if (!matchId || !isMatchPlayer) return;
    if (isOwnScoreLocked && isMarkerScoreLocked) return;

    if (isOffline) {
      offlineQueue.enqueue(matchId, holeNumber, scoreData);
      setPendingQueueSize(offlineQueue.size());
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
      // Queue for retry if network error
      offlineQueue.enqueue(matchId, holeNumber, scoreData);
      setPendingQueueSize(offlineQueue.size());
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [matchId, isMatchPlayer, isOwnScoreLocked, isMarkerScoreLocked, isOffline]);

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
        offlineQueue.remove(entry.matchId, entry.holeNumber);
      } catch {
        break; // Stop on first failure
      }
    }
    setPendingQueueSize(offlineQueue.size());
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
    setPendingQueueSize(offlineQueue.size());
  }, []);

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
    hasSubmitted,
    isOwnScoreLocked,
    isMarkerScoreLocked,
    isFullyLocked,
    validatedHoles,
    totalHoles,
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
