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

  // Count validated holes
  const validatedHoles = scoringView?.scores?.filter(s => {
    const playerScore = s.playerScores?.find(ps => ps.userId === currentUserId);
    return playerScore?.validationStatus === 'match';
  }).length ?? 0;

  // Total holes to play (18 or fewer if match decided early)
  const totalHoles = scoringView?.isDecided
    ? (scoringView?.matchStanding?.holesPlayed ?? 18)
    : 18;

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
  const submitScore = useCallback(async (holeNumber, scoreData) => {
    if (!matchId || !isMatchPlayer || hasSubmitted) return;

    if (isOffline) {
      offlineQueue.enqueue(matchId, holeNumber, scoreData);
      setPendingQueueSize(offlineQueue.size());
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedView = await submitHoleScoreUseCase.execute(matchId, holeNumber, scoreData);
      setScoringView(updatedView);
      setError(null);
    } catch (err) {
      // Queue for retry if network error
      offlineQueue.enqueue(matchId, holeNumber, scoreData);
      setPendingQueueSize(offlineQueue.size());
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [matchId, isMatchPlayer, hasSubmitted, isOffline]);

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

  // --- Session lock ---
  useEffect(() => {
    if (!matchId || !isMatchPlayer) return;

    const locked = !sessionLock.acquire(matchId, sessionIdRef.current);
    setIsSessionBlocked(locked);

    if (!locked) {
      // Refresh lock periodically
      sessionRefreshRef.current = setInterval(() => {
        sessionLock.refresh(sessionIdRef.current);
      }, SESSION_REFRESH_INTERVAL);
    }

    const cleanup = sessionLock.onLockEvent((event) => {
      if (event.type === 'LOCK_ACQUIRED' && event.sessionId !== sessionIdRef.current) {
        if (event.matchId === matchId) {
          // Another session acquired lock for this same match
          setIsSessionBlocked(true);
        } else if (event.matchId !== matchId) {
          // Another tab acquired lock for a different match - clear our local lock state
          setIsSessionBlocked(false);
        }
      }
      if (event.type === 'LOCK_RELEASED') {
        // Try to re-acquire
        const acquired = sessionLock.acquire(matchId, sessionIdRef.current);
        if (acquired) setIsSessionBlocked(false);
      }
    });

    const currentSessionId = sessionIdRef.current;
    const currentRefreshTimer = sessionRefreshRef.current;

    return () => {
      cleanup();
      sessionLock.release(currentSessionId);
      if (currentRefreshTimer) {
        clearInterval(currentRefreshTimer);
      }
    };
  }, [matchId, isMatchPlayer]);

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
    validatedHoles,
    totalHoles,
    canSubmitScorecard,

    // Actions
    setCurrentHole,
    submitScore,
    submitScorecard,
    concedeMatch,
    refetch: fetchScoringView,
  };
};
