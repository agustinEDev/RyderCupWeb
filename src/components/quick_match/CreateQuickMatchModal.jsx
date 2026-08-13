import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import HandicapInputPanel from './HandicapInputPanel';
import CourseStep from './CourseStep';
import ParticipantsStep from './ParticipantsStep';
import ScorersStep from './ScorersStep';
import SummaryStep from './SummaryStep';
import {
  createQuickMatchUseCase,
  addFriendParticipantUseCase,
  addGuestParticipantUseCase,
  removeQuickMatchParticipantUseCase,
  setQuickMatchParticipantHandicapUseCase,
  startQuickMatchUseCase,
  cancelQuickMatchUseCase,
  listFriendsUseCase,
  getGolfCourseUseCase,
} from '../../composition';
import {
  DEFAULT_ALLOWANCE_BY_MATCH_FORMAT,
  DEFAULT_FREE_PLAY_ALLOWANCE,
  FORMAT_CAPACITY,
  FREE_PLAY_CAPACITY,
  MAX_SCORERS,
  NO_TEE_KEY,
  TEAM_FORMATS,
  initialGuestForm,
  parseTeeKey,
  teeKey,
} from './createQuickMatchModalConstants';

const CreateQuickMatchModal = ({ onClose, onStarted, currentUser }) => {
  const { t } = useTranslation('quickMatch');
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [matchName, setMatchName] = useState('');
  const [mode, setMode] = useState('MATCH_PLAY');
  const [matchFormat, setMatchFormat] = useState('SINGLES');
  const [scoringFormat, setScoringFormat] = useState('STABLEFORD');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseTees, setCourseTees] = useState([]);
  const [teesLoading, setTeesLoading] = useState(false);
  // null while following the WHS default for the current format; a number once the user overrides it
  const [allowanceOverride, setAllowanceOverride] = useState(null);
  const [creatorTeeKey, setCreatorTeeKey] = useState(NO_TEE_KEY);
  const [quickMatch, setQuickMatch] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const [participantTab, setParticipantTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [guestTeeKey, setGuestTeeKey] = useState(NO_TEE_KEY);
  const [guestForm, setGuestForm] = useState(initialGuestForm);

  const [scorerIds, setScorerIds] = useState([]);
  // Which participant's handicap keypad is open (step 4 summary), or null when closed.
  const [editingHandicapParticipant, setEditingHandicapParticipant] = useState(null);
  // Whether the guest-form handicap keypad (step 2) is open.
  const [showGuestHandicapPanel, setShowGuestHandicapPanel] = useState(false);

  useEffect(() => {
    if (step === 2 && currentUser?.id) {
      listFriendsUseCase
        .execute(currentUser.id)
        .then((res) => setFriends(res.friendships))
        .catch(() => setFriends([]));
    }
  }, [step, currentUser?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset tee/tees state on every course change (including to none), mirrors useQuickMatchScoring's course-fetch pattern
    setCreatorTeeKey(NO_TEE_KEY);
    if (!selectedCourse?.id) {
      setCourseTees([]);
      return;
    }
    let cancelled = false;
    setTeesLoading(true);
    getGolfCourseUseCase
      .execute(selectedCourse.id)
      .then((course) => {
        if (!cancelled) setCourseTees(course.tees || []);
      })
      .catch(() => {
        if (!cancelled) setCourseTees([]);
      })
      .finally(() => {
        if (!cancelled) setTeesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourse?.id]);

  const isFreePlay = mode === 'FREE_PLAY';
  const defaultAllowance = isFreePlay
    ? DEFAULT_FREE_PLAY_ALLOWANCE
    : DEFAULT_ALLOWANCE_BY_MATCH_FORMAT[matchFormat] ?? 100;
  const allowancePercentage = allowanceOverride ?? defaultAllowance;
  const capacity = isFreePlay ? FREE_PLAY_CAPACITY : (FORMAT_CAPACITY[matchFormat] ?? 2);
  const isTeamFormat = !isFreePlay && TEAM_FORMATS.includes(matchFormat);
  const participants = quickMatch?.participants ?? [];
  const rosterFull = participants.length >= capacity;
  const registeredParticipants = participants.filter((p) => !p.isGuest);
  const availableFriends = friends.filter(
    (f) => !participants.some((p) => p.userId === f.otherUserId)
  );

  const cancelIfPending = useCallback(async () => {
    if (quickMatch?.isPending) {
      try {
        await cancelQuickMatchUseCase.execute(quickMatch.id);
      } catch {
        // Best-effort cleanup — the match stays PENDING and is simply abandoned
      }
    }
  }, [quickMatch]);

  const handleClose = useCallback(async () => {
    await cancelIfPending();
    onClose();
  }, [cancelIfPending, onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, handleClose]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setAllowanceOverride(null);
  };

  const handleCourseNext = async () => {
    if (!selectedCourse) {
      setError(t('create.course.errorCourseRequired'));
      return;
    }
    if (teesLoading) {
      setError(t('create.course.errorTeeRequired'));
      return;
    }
    const creatorTeeIsValid = courseTees.some((tee) => teeKey(tee.color, tee.gender) === creatorTeeKey);
    if (courseTees.length > 0 && !creatorTeeIsValid) {
      setError(t('create.course.errorTeeRequired'));
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const { color: creatorTeeColor, teeGender: creatorTeeGender } = parseTeeKey(creatorTeeKey);
      const created = await createQuickMatchUseCase.execute(
        selectedCourse.id,
        isFreePlay ? null : matchFormat,
        isFreePlay ? scoringFormat : null,
        matchName.trim() || null,
        { allowancePercentage, creatorTeeColor, creatorTeeGender }
      );
      setQuickMatch(created);
      setStep(2);
    } catch (err) {
      setError(err.message || t('create.errors.generic'));
    } finally {
      setIsProcessing(false);
    }
  };

  // La salida llega del panel que abre el + del propio amigo, así que ya no
  // hace falta guardarla por amigo mientras se decide: se elige y se añade en
  // el mismo gesto.
  const handleAddFriend = async (friend, friendTeeKeyValue) => {
    if (courseTees.length > 0 && (!friendTeeKeyValue || friendTeeKeyValue === NO_TEE_KEY)) {
      setError(t('create.participants.errorTeeRequired'));
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const { color, teeGender } = parseTeeKey(friendTeeKeyValue ?? NO_TEE_KEY);
      const updated = await addFriendParticipantUseCase.execute(
        quickMatch.id,
        friend.otherUserId,
        isTeamFormat ? selectedTeam : null,
        { color, teeGender }
      );
      setQuickMatch(updated);
    } catch (err) {
      setError(err.message || t('create.errors.generic'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGuestFirstNameChange = (value) => setGuestForm((g) => ({ ...g, firstName: value }));
  const handleGuestLastNameChange = (value) => setGuestForm((g) => ({ ...g, lastName: value }));

  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!guestForm.firstName.trim() || !guestForm.lastName.trim()) return;
    if (courseTees.length > 0 && guestTeeKey === NO_TEE_KEY) {
      setError(t('create.participants.errorTeeRequired'));
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      const { color, teeGender } = parseTeeKey(guestTeeKey);
      const updated = await addGuestParticipantUseCase.execute(quickMatch.id, {
        firstName: guestForm.firstName.trim(),
        lastName: guestForm.lastName.trim(),
        handicap: guestForm.handicap.trim() ? Number(guestForm.handicap) : null,
        team: isTeamFormat ? selectedTeam : null,
        color,
        teeGender,
      });
      setQuickMatch(updated);
      setGuestForm(initialGuestForm);
      setGuestTeeKey(NO_TEE_KEY);
    } catch (err) {
      setError(err.message || t('create.errors.generic'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    setIsProcessing(true);
    setError('');
    try {
      const updated = await removeQuickMatchParticipantUseCase.execute(quickMatch.id, participantId);
      setQuickMatch(updated);
      setScorerIds((prev) => prev.filter((id) => id !== participantId));
    } catch (err) {
      setError(err.message || t('create.errors.generic'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToCourse = async () => {
    setIsProcessing(true);
    setError('');
    await cancelIfPending();
    setQuickMatch(null);
    setGuestTeeKey(NO_TEE_KEY);
    setGuestForm(initialGuestForm);
    setIsProcessing(false);
    setStep(1);
  };

  const handleBackToParticipants = () => {
    setError('');
    setStep(2);
  };

  const goToScorers = () => {
    const creatorParticipant = participants.find((p) => p.userId === currentUser.id);
    setScorerIds(creatorParticipant ? [creatorParticipant.participantId] : []);
    setError('');
    setStep(3);
  };

  const toggleScorer = (participantId) => {
    setScorerIds((prev) => {
      if (prev.includes(participantId)) return prev.filter((id) => id !== participantId);
      if (prev.length >= MAX_SCORERS) return prev;
      return [...prev, participantId];
    });
  };

  const goToSummary = () => {
    if (scorerIds.length === 0) {
      setError(t('create.scorers.errorMinScorers'));
      return;
    }
    setError('');
    setStep(4);
  };

  const handleBackToScorers = () => {
    setError('');
    setStep(3);
  };

  const handleConfirmParticipantHandicap = async (newHandicap) => {
    const participant = editingHandicapParticipant;
    setEditingHandicapParticipant(null);
    if (newHandicap === (participant.handicap ?? null)) return;

    setIsProcessing(true);
    setError('');
    try {
      const updated = await setQuickMatchParticipantHandicapUseCase.execute(
        quickMatch.id,
        participant.participantId,
        newHandicap
      );
      setQuickMatch(updated);
    } catch (err) {
      setError(err.message || t('create.errors.generic'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmGuestHandicap = (newHandicap) => {
    setGuestForm((g) => ({ ...g, handicap: newHandicap === null ? '' : String(newHandicap) }));
    setShowGuestHandicapPanel(false);
  };

  const handleStart = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const started = await startQuickMatchUseCase.execute(quickMatch.id, scorerIds);
      onStarted(started.id);
    } catch (err) {
      setError(err.message || t('create.errors.generic'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestNewCourse = async () => {
    await handleClose();
    navigate('/creator/golf-courses/new');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-match-modal-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 id="quick-match-modal-title" className="text-lg font-semibold text-gray-900">{t('create.title')}</h2>
            <p className="text-xs text-gray-500">{t('create.step', { current: step, total: 4 })}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600" data-testid="quick-match-modal-error">
            {error}
          </div>
        )}

        {step === 1 && (
          <CourseStep
            t={t}
            matchName={matchName}
            onMatchNameChange={setMatchName}
            mode={mode}
            onModeChange={handleModeChange}
            isFreePlay={isFreePlay}
            scoringFormat={scoringFormat}
            onScoringFormatChange={setScoringFormat}
            matchFormat={matchFormat}
            onMatchFormatChange={setMatchFormat}
            countryCode={currentUser?.country_code}
            selectedCourse={selectedCourse}
            onCourseSelect={setSelectedCourse}
            onRequestNewCourse={handleRequestNewCourse}
            courseTees={courseTees}
            creatorTeeKey={creatorTeeKey}
            onCreatorTeeKeyChange={setCreatorTeeKey}
            allowancePercentage={allowancePercentage}
            onAllowanceChange={setAllowanceOverride}
            isProcessing={isProcessing}
            teesLoading={teesLoading}
            onClose={handleClose}
            onNext={handleCourseNext}
          />
        )}

        {step === 2 && (
          <ParticipantsStep
            t={t}
            currentUser={currentUser}
            participants={participants}
            capacity={capacity}
            rosterFull={rosterFull}
            isTeamFormat={isTeamFormat}
            isFreePlay={isFreePlay}
            selectedTeam={selectedTeam}
            onSelectedTeamChange={setSelectedTeam}
            participantTab={participantTab}
            onParticipantTabChange={setParticipantTab}
            availableFriends={availableFriends}
            courseTees={courseTees}
            onAddFriend={handleAddFriend}
            guestForm={guestForm}
            onGuestFirstNameChange={handleGuestFirstNameChange}
            onGuestLastNameChange={handleGuestLastNameChange}
            onAddGuest={handleAddGuest}
            onOpenGuestHandicapPanel={() => setShowGuestHandicapPanel(true)}
            guestTeeKey={guestTeeKey}
            onGuestTeeKeyChange={setGuestTeeKey}
            onRemoveParticipant={handleRemoveParticipant}
            isProcessing={isProcessing}
            onBack={handleBackToCourse}
            onClose={handleClose}
            onNext={goToScorers}
          />
        )}

        {step === 3 && (
          <ScorersStep
            t={t}
            registeredParticipants={registeredParticipants}
            currentUser={currentUser}
            scorerIds={scorerIds}
            onToggleScorer={toggleScorer}
            isProcessing={isProcessing}
            onBack={handleBackToParticipants}
            onClose={handleClose}
            onNext={goToSummary}
          />
        )}

        {step === 4 && (
          <SummaryStep
            t={t}
            selectedCourse={selectedCourse}
            isFreePlay={isFreePlay}
            scoringFormat={scoringFormat}
            matchFormat={matchFormat}
            allowancePercentage={allowancePercentage}
            participants={participants}
            currentUser={currentUser}
            isTeamFormat={isTeamFormat}
            onEditHandicap={setEditingHandicapParticipant}
            isProcessing={isProcessing}
            registeredParticipants={registeredParticipants}
            scorerIds={scorerIds}
            onBack={handleBackToScorers}
            onClose={handleClose}
            onStart={handleStart}
          />
        )}
      </div>

      {showGuestHandicapPanel && (
        <HandicapInputPanel
          label={t('create.participants.guestHandicap')}
          value={guestForm.handicap ? Number(guestForm.handicap) : null}
          onClose={() => setShowGuestHandicapPanel(false)}
          onConfirm={handleConfirmGuestHandicap}
        />
      )}

      {editingHandicapParticipant && (
        <HandicapInputPanel
          label={editingHandicapParticipant.name}
          value={editingHandicapParticipant.handicap}
          onClose={() => setEditingHandicapParticipant(null)}
          onConfirm={handleConfirmParticipantHandicap}
        />
      )}
    </div>
  );
};

export default CreateQuickMatchModal;
