import GolfCourseSearchBox from '../golf_course/GolfCourseSearchBox';
import TeeSelectButtons from './TeeSelectButtons';
import {
  FORMAT_CAPACITY,
  FORMAT_LABEL_KEY,
  FREE_PLAY_ALLOWANCE_OPTIONS,
  MATCH_PLAY_ALLOWANCE_OPTIONS,
  SCORING_FORMAT_LABEL_KEY,
} from './createQuickMatchModalConstants';

/**
 * Wizard step 1: match name, mode (match play / free play), format,
 * golf course + creator tee, and allowance percentage.
 */
const CourseStep = ({
  t,
  matchName,
  onMatchNameChange,
  mode,
  onModeChange,
  isFreePlay,
  scoringFormat,
  onScoringFormatChange,
  matchFormat,
  onMatchFormatChange,
  countryCode,
  selectedCourse,
  onCourseSelect,
  onRequestNewCourse,
  courseTees,
  creatorTeeKey,
  onCreatorTeeKeyChange,
  allowancePercentage,
  onAllowanceChange,
  isProcessing,
  teesLoading,
  onClose,
  onNext,
}) => (
  <div className="p-4 space-y-4">
    <div>
      <label htmlFor="quick-match-name" className="block text-sm font-medium text-gray-700 mb-1">
        {t('create.course.nameLabel')}
      </label>
      <input
        id="quick-match-name"
        type="text"
        value={matchName}
        onChange={(e) => onMatchNameChange(e.target.value)}
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
          onClick={() => onModeChange('MATCH_PLAY')}
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
          onClick={() => onModeChange('FREE_PLAY')}
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
              onClick={() => onScoringFormatChange(format)}
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
              onClick={() => onMatchFormatChange(format)}
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
        countryCode={countryCode}
        selectedCourse={selectedCourse}
        onCourseSelect={onCourseSelect}
        onRequestNewCourse={onRequestNewCourse}
      />
    </div>

    {courseTees.length > 0 && (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('create.course.yourTeeLabel')}
        </label>
        <TeeSelectButtons
          value={creatorTeeKey}
          onChange={onCreatorTeeKeyChange}
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
            onClick={() => onAllowanceChange(pct)}
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
        onClick={onClose}
        disabled={isProcessing}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
      >
        {t('create.cancel')}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={isProcessing || teesLoading}
        data-testid="quick-match-course-next"
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
      >
        {isProcessing ? t('create.course.creating') : t('create.course.next')}
      </button>
    </div>
  </div>
);

export default CourseStep;
