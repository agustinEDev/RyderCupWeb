import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getQuickMatchUseCase,
  getGolfCourseUseCase,
  submitQuickMatchHoleScoreUseCase,
  submitQuickMatchProxyHoleScoreUseCase,
  completeQuickMatchUseCase,
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
  const [currentHole, setCurrentHole] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const holesLoadedRef = useRef(false);
  const pollIntervalRef = useRef(null);

  const fetchQuickMatch = useCallback(async () => {
    if (!quickMatchId) return;
    try {
      const data = await getQuickMatchUseCase.execute(quickMatchId);
      setQuickMatch(data);
      setError(null);

      if (!holesLoadedRef.current) {
        holesLoadedRef.current = true;
        try {
          const course = await getGolfCourseUseCase.execute(data.golfCourseId);
          setHoles(course.holes || []);
        } catch {
          holesLoadedRef.current = false;
        }
      }
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [quickMatchId]);

  useEffect(() => {
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

  const totalHoles = 18;

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
        await fetchQuickMatch();
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [quickMatchId, isScorer, myParticipant, fetchQuickMatch]
  );

  const completeMatch = useCallback(async () => {
    if (!quickMatchId || !isCreator) return;

    setIsSubmitting(true);
    try {
      await completeQuickMatchUseCase.execute(quickMatchId);
      await fetchQuickMatch();
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [quickMatchId, isCreator, fetchQuickMatch]);

  return {
    quickMatch,
    holes,
    currentHole,
    isLoading,
    error,
    isSubmitting,

    myParticipant,
    isCreator,
    isScorer,
    coveredParticipantIds,
    totalHoles,

    setCurrentHole,
    submitScore,
    completeMatch,
    refetch: fetchQuickMatch,
  };
};
