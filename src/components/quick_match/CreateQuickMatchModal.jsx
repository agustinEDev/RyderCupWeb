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
  getGolfCourseUseCase,
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
// Mirrors backend MAX_FREE_PLAY_PLAYERS (quick_match domain entity)
const FREE_PLAY_CAPACITY = 4;
const SCORING_FORMAT_LABEL_KEY = {
  MEDAL: 'formatMedal',
  STABLEFORD: 'formatStableford',
};

// Mirrors backend WHS allowance defaults (quick_match domain entity get_effective_allowance())
const DEFAULT_ALLOWANCE_BY_MATCH_FORMAT = { SINGLES: 100, FOURBALL: 90, FOURSOMES: 50 };
const DEFAULT_FREE_PLAY_ALLOWANCE = 95;
// Curated quick-pick values instead of the full 50-100 (step 5) WHS range:
// match play only ever really uses its three format defaults, and free play
// (stroke play) conventionally sits at 90/95/100.
const MATCH_PLAY_ALLOWANCE_OPTIONS = [50, 90, 100];
const FREE_PLAY_ALLOWANCE_OPTIONS = [90, 95, 100];

const NO_TEE_KEY = '';
const teeKey = (category, gender) => (category ? `${category}|${gender ?? ''}` : NO_TEE_KEY);
const parseTeeKey = (key) => {
  if (!key) return { teeCategory: null, teeGender: null };
  const [category, gender] = key.split('|');
  return { teeCategory: category, teeGender: gender || null };
};

// Tee identifiers are free text (e.g. "Blue", "Green (Women)", "Championship"),
// but most golf courses name them after the actual marker color on the tee box.
// When the identifier's first word matches one of these, the button picks up
// that real color instead of the generic primary color.
const TEE_COLOR_STYLES = {
  white: { dot: 'bg-white border border-gray-400', selected: 'border-gray-500 bg-gray-50 text-gray-700' },
  yellow: { dot: 'bg-yellow-400', selected: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
  gold: { dot: 'bg-yellow-500', selected: 'border-yellow-600 bg-yellow-50 text-yellow-700' },
  blue: { dot: 'bg-blue-500', selected: 'border-blue-500 bg-blue-50 text-blue-700' },
  red: { dot: 'bg-red-500', selected: 'border-red-500 bg-red-50 text-red-700' },
  green: { dot: 'bg-green-500', selected: 'border-green-500 bg-green-50 text-green-700' },
  black: { dot: 'bg-black', selected: 'border-gray-800 bg-gray-100 text-gray-900' },
  orange: { dot: 'bg-orange-500', selected: 'border-orange-500 bg-orange-50 text-orange-700' },
  silver: { dot: 'bg-gray-300 border border-gray-400', selected: 'border-gray-400 bg-gray-50 text-gray-700' },
  purple: { dot: 'bg-purple-500', selected: 'border-purple-500 bg-purple-50 text-purple-700' },
  bronze: { dot: 'bg-amber-700', selected: 'border-amber-700 bg-amber-50 text-amber-800' },
};

const resolveTeeColor = (identifier) => {
  const firstWord = identifier?.trim().split(/\s+/)[0]?.toLowerCase();
  return TEE_COLOR_STYLES[firstWord] ?? null;
};

const initialGuestForm = { firstName: '', lastName: '', handicap: '' };

/**
 * Button-group tee picker, shared by the creator (step 1) and each friend/guest
 * (step 2) — avoids duplicating the tee option list/styling three times. Tee
 * selection is mandatory whenever the course has tees: there's no "unspecified"
 * option, so nothing is pre-selected and the caller must validate before
 * proceeding (see handleCourseNext/handleAddFriend/handleAddGuest).
 */
const TeeSelectButtons = ({ value, onChange, courseTees, ariaLabel, testIdPrefix }) => {
  const options = courseTees.map((tee) => {
    const key = teeKey(tee.teeCategory, tee.gender);
    return { key, label: tee.identifier, testKey: key, color: resolveTeeColor(tee.identifier) };
  });

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          aria-pressed={value === option.key}
          data-testid={testIdPrefix ? `${testIdPrefix}-${option.testKey}` : undefined}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border text-sm font-medium transition-colors ${
            value === option.key
              ? (option.color?.selected ?? 'border-primary bg-primary/5 text-primary')
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {option.color && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${option.color.dot}`} />}
          {option.label}
        </button>
      ))}
    </div>
  );
};

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
  // Tee chosen per friend row (keyed by friend.id), so each friend can pick a different one
  const [friendTeeByFriendId, setFriendTeeByFriendId] = useState({});
  const [guestTeeKey, setGuestTeeKey] = useState(NO_TEE_KEY);
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
    if (teesLoading) {
      setError(t('create.course.errorTeeRequired'));
      return;
    }
    const creatorTeeIsValid = courseTees.some((tee) => teeKey(tee.teeCategory, tee.gender) === creatorTeeKey);
    if (courseTees.length > 0 && !creatorTeeIsValid) {
      setError(t('create.course.errorTeeRequired'));
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const { teeCategory: creatorTeeCategory, teeGender: creatorTeeGender } = parseTeeKey(creatorTeeKey);
      const created = await createQuickMatchUseCase.execute(
        selectedCourse.id,
        isFreePlay ? null : matchFormat,
        isFreePlay ? scoringFormat : null,
        matchName.trim() || null,
        { allowancePercentage, creatorTeeCategory, creatorTeeGender }
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
    const friendTeeKeyValue = friendTeeByFriendId[friend.id] ?? NO_TEE_KEY;
    if (courseTees.length > 0 && friendTeeKeyValue === NO_TEE_KEY) {
      setError(t('create.participants.errorTeeRequired'));
      return;
    }
    setIsProcessing(true);
    setError('');
    try {
      const { teeCategory, teeGender } = parseTeeKey(friendTeeKeyValue);
      const updated = await addFriendParticipantUseCase.execute(
        quickMatch.id,
        friend.otherUserId,
        isTeamFormat ? selectedTeam : null,
        { teeCategory, teeGender }
      );
      setQuickMatch(updated);
      setFriendTeeByFriendId((prev) => {
        const next = { ...prev };
        delete next[friend.id];
        return next;
      });
    } catch (err) {
      setError(err.message || t('create.errors.generic'));
    } finally {
      setIsProcessing(false);
    }
  };

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
      const { teeCategory, teeGender } = parseTeeKey(guestTeeKey);
      const updated = await addGuestParticipantUseCase.execute(quickMatch.id, {
        firstName: guestForm.firstName.trim(),
        lastName: guestForm.lastName.trim(),
        handicap: guestForm.handicap.trim() ? Number(guestForm.handicap) : null,
        team: isTeamFormat ? selectedTeam : null,
        teeCategory,
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
    try {
      if (quickMatch?.isPending) {
        await cancelQuickMatchUseCase.execute(quickMatch.id);
      }
    } catch {
      // Best-effort cleanup — the match stays PENDING and is simply abandoned, same as handleClose
    } finally {
      setQuickMatch(null);
      setFriendTeeByFriendId({});
      setGuestTeeKey(NO_TEE_KEY);
      setGuestForm(initialGuestForm);
      setIsProcessing(false);
      setStep(1);
    }
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
                {t('create.course.modeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('MATCH_PLAY');
                    setAllowanceOverride(null);
                  }}
                  data-testid="mode-option-MATCH_PLAY"
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    mode === 'MATCH_PLAY'
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('create.course.modeMatchPlay')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('FREE_PLAY');
                    setAllowanceOverride(null);
                  }}
                  data-testid="mode-option-FREE_PLAY"
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    mode === 'FREE_PLAY'
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t('create.course.modeFreePlay')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('create.course.formatLabel')}
              </label>
              {isFreePlay ? (
                <div className="grid grid-cols-1 gap-2">
                  {Object.keys(SCORING_FORMAT_LABEL_KEY).map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => setScoringFormat(format)}
                      data-testid={`scoring-format-option-${format}`}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        scoringFormat === format
                          ? 'border-primary bg-primary/5 text-primary font-medium'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {t(`create.course.${SCORING_FORMAT_LABEL_KEY[format]}`)}
                    </button>
                  ))}
                </div>
              ) : (
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
              )}
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

            {courseTees.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('create.course.yourTeeLabel')}
                </label>
                <TeeSelectButtons
                  value={creatorTeeKey}
                  onChange={setCreatorTeeKey}
                  courseTees={courseTees}
                  ariaLabel={t('create.course.yourTeeLabel')}
                  testIdPrefix="quick-match-creator-tee-option"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('create.course.allowanceLabel')}
              </label>
              <div className="flex gap-2" role="group" aria-label={t('create.course.allowanceLabel')}>
                {(isFreePlay ? FREE_PLAY_ALLOWANCE_OPTIONS : MATCH_PLAY_ALLOWANCE_OPTIONS).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setAllowanceOverride(pct)}
                    aria-pressed={allowancePercentage === pct}
                    data-testid={`quick-match-allowance-option-${pct}`}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      allowancePercentage === pct
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
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
                disabled={isProcessing || teesLoading}
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
                          data-testid={`quick-match-friend-row-${f.id}`}
                          className="px-3 py-2 border border-gray-200 rounded-lg space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-gray-900 truncate">{f.otherUserName}</span>
                            <button
                              type="button"
                              onClick={() => handleAddFriend(f)}
                              disabled={isProcessing}
                              className="text-xs font-medium text-primary hover:underline disabled:opacity-50 flex-shrink-0"
                            >
                              {t('create.participants.addFriend')}
                            </button>
                          </div>
                          {courseTees.length > 0 && (
                            <TeeSelectButtons
                              value={friendTeeByFriendId[f.id] ?? NO_TEE_KEY}
                              onChange={(key) => setFriendTeeByFriendId((prev) => ({ ...prev, [f.id]: key }))}
                              courseTees={courseTees}
                              ariaLabel={t('create.participants.teeLabel')}
                              testIdPrefix={`quick-match-friend-tee-select-${f.id}`}
                            />
                          )}
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
                    {courseTees.length > 0 && (
                      <TeeSelectButtons
                        value={guestTeeKey}
                        onChange={setGuestTeeKey}
                        courseTees={courseTees}
                        ariaLabel={t('create.participants.teeLabel')}
                        testIdPrefix="quick-match-guest-tee-option"
                      />
                    )}
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

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleBackToCourse}
                disabled={isProcessing}
                data-testid="quick-match-participants-back"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                {t('create.participants.back')}
              </button>
              <div className="flex gap-3">
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
                  disabled={isProcessing || (isFreePlay ? participants.length < 1 : participants.length < capacity)}
                  data-testid="quick-match-participants-next"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {t('create.participants.next')}
                </button>
              </div>
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

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleBackToParticipants}
                disabled={isProcessing}
                data-testid="quick-match-scorers-back"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                {t('create.scorers.back')}
              </button>
              <div className="flex gap-3">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateQuickMatchModal;
