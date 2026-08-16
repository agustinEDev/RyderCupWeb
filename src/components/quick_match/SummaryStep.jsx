import TeeColorBadge from '../golf_course/TeeColorBadge';
import { FORMAT_LABEL_KEY, SCORING_FORMAT_LABEL_KEY } from './createQuickMatchModalConstants';

/**
 * Wizard step 4: pre-start summary — course/format/play-mode recap,
 * per-participant handicap review/override, and the scorer list.
 *
 * The recap repeats the two settings that decide how many strokes each player
 * gets — the play mode and the tee — because both are invisible once the round
 * starts and a wrong one costs the whole card. A scratch match draws no
 * strokes, so its allowance is not a percentage that applies: showing "100%"
 * there contradicted step 1, which greys the allowance out with the same
 * reason.
 */
const SummaryStep = ({
  t,
  selectedCourse,
  isFreePlay,
  scoringFormat,
  matchFormat,
  allowancePercentage,
  playMode,
  participants,
  currentUser,
  isTeamFormat,
  onEditHandicap,
  isProcessing,
  registeredParticipants,
  scorerIds,
  onBack,
  onClose,
  onStart,
}) => {
  const isScratch = playMode === 'SCRATCH';

  return (
  <div className="p-4 space-y-4">
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-1">{t('create.summary.heading')}</h3>
      <p className="text-xs text-gray-500 mb-3">{t('create.summary.description')}</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4">
        <dt className="text-gray-500">{t('create.summary.courseLabel')}</dt>
        <dd className="text-gray-900 text-right truncate">{selectedCourse?.name}</dd>
        <dt className="text-gray-500">{t('create.summary.formatLabel')}</dt>
        <dd className="text-gray-900 text-right">
          {isFreePlay
            ? t(`create.course.${SCORING_FORMAT_LABEL_KEY[scoringFormat]}`)
            : t(`create.course.${FORMAT_LABEL_KEY[matchFormat]}`)}
        </dd>
        <dt className="text-gray-500">{t('create.course.playModeLabel')}</dt>
        <dd className="text-gray-900 text-right" data-testid="quick-match-summary-play-mode">
          {isScratch
            ? t('create.course.playModeScratch')
            : t('create.course.playModeHandicap')}
        </dd>
        <dt className="text-gray-500">{t('create.summary.allowanceLabel')}</dt>
        <dd
          className={`text-right ${isScratch ? 'text-gray-400' : 'text-gray-900'}`}
          data-testid="quick-match-summary-allowance"
        >
          {isScratch ? t('create.summary.allowanceNotApplied') : `${allowancePercentage}%`}
        </dd>
      </dl>
    </div>

    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">
        {t('create.summary.participantsLabel')}
      </p>
      <ul className="space-y-2">
        {participants.map((p) => (
          <li key={p.participantId} className="px-3 py-2 bg-gray-50 rounded-lg space-y-1.5">
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
              {p.color && (
                <span className="flex-shrink-0">
                  <TeeColorBadge color={p.color} gender={p.teeGender} />
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onEditHandicap(p)}
              disabled={isProcessing}
              aria-label={t('create.summary.editHandicapNamed', { name: p.name })}
              data-testid={`quick-match-handicap-button-${p.participantId}`}
              className={`px-3 py-1 border border-gray-300 rounded-md text-sm hover:border-gray-400 disabled:opacity-50 ${
                p.handicap != null ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {p.handicap != null ? p.handicap : t('create.summary.handicapPlaceholder')}
            </button>
          </li>
        ))}
      </ul>
    </div>

    <p className="text-xs text-gray-500">
      {t('create.summary.scorersLabel')}:{' '}
      {registeredParticipants
        .filter((p) => scorerIds.includes(p.participantId))
        .map((p) => p.name)
        .join(', ')}
    </p>

    <div className="flex items-center justify-between gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        disabled={isProcessing}
        data-testid="quick-match-summary-back"
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
      >
        {t('create.summary.back')}
      </button>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          {t('create.cancel')}
        </button>
        <button
          type="button"
          onClick={onStart}
          disabled={isProcessing}
          data-testid="quick-match-start"
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isProcessing ? t('create.summary.starting') : t('create.summary.start')}
        </button>
      </div>
    </div>
  </div>
  );
};

export default SummaryStep;
