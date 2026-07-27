import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { X, Trash2 } from 'lucide-react';
import GolfCourseSearchBox from '../golf_course/GolfCourseSearchBox';
import {
  createQuickMatchUseCase,
  addFriendParticipantUseCase,
  addGuestParticipantUseCase,
  removeQuickMatchParticipantUseCase,
  startQuickMatchUseCase,
  cancelQuickMatchUseCase,
  listFriendsUseCase,
} from '../../composition';

// Mirrors backend MatchFormat.players_per_team() * 2 (SINGLES 1v1, FOURBALL/FOURSOMES 2v2)
const FORMAT_CAPACITY = { SINGLES: 2, FOURBALL: 4, FOURSOMES: 4 };
const TEAM_FORMATS = ['FOURBALL', 'FOURSOMES'];
const FORMAT_LABEL_KEY = {
  SINGLES: 'formatSingles',
  FOURBALL: 'formatFourball',
  FOURSOMES: 'formatFoursomes',
};
// Mirrors backend MAX_SCORERS (quick_match domain entity)
const MAX_SCORERS = 4;

const initialGuestForm = { firstName: '', lastName: '', handicap: '' };

const CreateQuickMatchModal = ({ onClose, onStarted, currentUser }) => {
  const { t } = useTranslation('quickMatch');
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [matchName, setMatchName] = useState('');
  const [matchFormat, setMatchFormat] = useState('SINGLES');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [quickMatch, setQuickMatch] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const [participantTab, setParticipantTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [guestForm, setGuestForm] = useState(initialGuestForm);

  const [scorerIds, setScorerIds] = useState([]);

  useEffect(() => {
    if (step === 2 && currentUser?.id) {
      listFriendsUseCase
        .execute(currentUser.id)
        .then((res) => setFriends(res.friendships))
        .catch(() => setFriends([]));
    }
  }, [step, currentUser?.id]);

  const capacity = FORMAT_CAPACITY[matchFormat] ?? 2;
  const isTeamFormat = TEAM_FORMATS.includes(matchFormat);
  const participants = quickMatch?.participants ?? [];
  const rosterFull = participants.length >= capacity;
  const registeredParticipants = participants.filter((p) => !p.isGuest);
  const availableFriends = friends.filter(
    (f) => !participants.some((p) => p.userId === f.otherUserId)
  );

  const handleClose = useCallback(async () => {
    if (quickMatch?.isPending) {
      try {
        await cancelQuickMatchUseCase.execute(quickMatch.id);
      } catch {
        // Best-effort cleanup — the match stays PENDING and is simply abandoned
      }
    }
    onClose();
  }, [quickMatch, onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, handleClose]);

  const handleCourseNext = async () => {
    if (!selectedCourse) {
      setError(t('create.course.errorCourseRequired'));
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const created = await createQuickMatchUseCase.execute(
        selectedCourse.id,
        matchFormat,
        matchName.trim() || null
      );
      setQuickMatch(created);
      setStep(2);
    } catch (err) {
      setError(err.message || t('create.errors.generic'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddFriend = async (friend) => {
    setIsProcessing(true);
    setError('');
    try {
      const updated = await addFriendParticipantUseCase.execute(
        quickMatch.id,
        friend.otherUserId,
        isTeamFormat ? selectedTeam : null
      );
      setQuickMatch(updated);
    } catch (err) {
      setError(err.message || t('create.errors.generic'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!guestForm.firstName.trim() || !guestForm.lastName.trim()) return;

    setIsProcessing(true);
    setError('');
    try {
      const updated = await addGuestParticipantUseCase.execute(quickMatch.id, {
        firstName: guestForm.firstName.trim(),
        lastName: guestForm.lastName.trim(),
        handicap: guestForm.handicap.trim() ? Number(guestForm.handicap) : null,
        team: isTeamFormat ? selectedTeam : null,
      });
      setQuickMatch(updated);
      setGuestForm(initialGuestForm);
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

  const handleStart = async () => {
    if (scorerIds.length === 0) {
      setError(t('create.scorers.errorMinScorers'));
      return;
    }
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
            <p className="text-xs text-gray-500">{t('create.step', { current: step, total: 3 })}</p>
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
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="quick-match-name" className="block text-sm font-medium text-gray-700 mb-1">
                {t('create.course.nameLabel')}
              </label>
              <input
                id="quick-match-name"
                type="text"
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                placeholder={t('create.course.namePlaceholder')}
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="quick-match-name-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('create.course.formatLabel')}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {Object.keys(FORMAT_CAPACITY).map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setMatchFormat(format)}
                    data-testid={`format-option-${format}`}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      matchFormat === format
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {t(`create.course.${FORMAT_LABEL_KEY[format]}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('create.course.courseLabel')}
              </label>
              <GolfCourseSearchBox
                countryCode={currentUser?.country_code}
                selectedCourse={selectedCourse}
                onCourseSelect={setSelectedCourse}
                onRequestNewCourse={handleRequestNewCourse}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                {t('create.cancel')}
              </button>
              <button
                type="button"
                onClick={handleCourseNext}
                disabled={isProcessing}
                data-testid="quick-match-course-next"
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isProcessing ? t('create.course.creating') : t('create.course.next')}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {t('create.participants.rosterTitle', { count: participants.length, max: capacity })}
              </p>
              <ul className="space-y-2">
                {participants.map((p) => (
                  <li
                    key={p.participantId}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                      {p.userId === currentUser.id && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded flex-shrink-0">
                          {t('create.participants.creatorBadge')}
                        </span>
                      )}
                      {p.isGuest && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded flex-shrink-0">
                          {t('create.participants.guestBadge')}
                        </span>
                      )}
                      {isTeamFormat && p.team && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {p.team === 'A' ? t('create.participants.teamA') : t('create.participants.teamB')}
                        </span>
                      )}
                    </div>
                    {p.userId !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(p.participantId)}
                        disabled={isProcessing}
                        className="text-gray-400 hover:text-red-600 flex-shrink-0"
                        aria-label={t('create.participants.remove')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {rosterFull ? (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                {t('create.participants.rosterFull')}
              </p>
            ) : (
              <>
                {isTeamFormat && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTeam('A')}
                      className={`flex-1 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        selectedTeam === 'A' ? 'border-primary text-primary bg-primary/5' : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {t('create.participants.teamA')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTeam('B')}
                      className={`flex-1 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        selectedTeam === 'B' ? 'border-primary text-primary bg-primary/5' : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {t('create.participants.teamB')}
                    </button>
                  </div>
                )}

                <div className="flex border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setParticipantTab('friends')}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      participantTab === 'friends' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t('create.participants.tabFriends')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setParticipantTab('guest')}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      participantTab === 'guest' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t('create.participants.tabGuest')}
                  </button>
                </div>

                {participantTab === 'friends' && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableFriends.length === 0 ? (
                      <p className="text-sm text-gray-500">{t('create.participants.noFriends')}</p>
                    ) : (
                      availableFriends.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg"
                        >
                          <span className="text-sm text-gray-900">{f.otherUserName}</span>
                          <button
                            type="button"
                            onClick={() => handleAddFriend(f)}
                            disabled={isProcessing}
                            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                          >
                            {t('create.participants.addFriend')}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {participantTab === 'guest' && (
                  <form onSubmit={handleAddGuest} className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={guestForm.firstName}
                        onChange={(e) => setGuestForm((g) => ({ ...g, firstName: e.target.value }))}
                        placeholder={t('create.participants.guestFirstName')}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="text"
                        required
                        value={guestForm.lastName}
                        onChange={(e) => setGuestForm((g) => ({ ...g, lastName: e.target.value }))}
                        placeholder={t('create.participants.guestLastName')}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      min="-10"
                      max="54"
                      value={guestForm.handicap}
                      onChange={(e) => setGuestForm((g) => ({ ...g, handicap: e.target.value }))}
                      placeholder={t('create.participants.guestHandicap')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                      {t('create.participants.addGuest')}
                    </button>
                  </form>
                )}
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                {t('create.cancel')}
              </button>
              <button
                type="button"
                onClick={goToScorers}
                disabled={isProcessing || participants.length < capacity}
                data-testid="quick-match-participants-next"
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {t('create.participants.next')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">{t('create.scorers.heading')}</h3>
              <p className="text-xs text-gray-500 mb-3">{t('create.scorers.description')}</p>
              <ul className="space-y-2">
                {registeredParticipants.map((p) => {
                  const isCreatorParticipant = p.userId === currentUser.id;
                  const checked = scorerIds.includes(p.participantId);
                  return (
                    <li key={p.participantId}>
                      <label
                        className={`flex items-center gap-3 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                          checked ? 'border-primary bg-primary/5' : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isCreatorParticipant || (scorerIds.length >= MAX_SCORERS && !checked)}
                          onChange={() => toggleScorer(p.participantId)}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-gray-900">{p.name}</span>
                        {isCreatorParticipant && (
                          <span className="text-xs text-gray-400">({t('create.participants.creatorBadge')})</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                {t('create.cancel')}
              </button>
              <button
                type="button"
                onClick={handleStart}
                disabled={isProcessing}
                data-testid="quick-match-start"
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {isProcessing ? t('create.scorers.starting') : t('create.scorers.start')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateQuickMatchModal;
