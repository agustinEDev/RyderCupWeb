import { MAX_SCORERS } from './createQuickMatchModalConstants';

/**
 * Wizard step 3: pick which registered participants act as scorers
 * (1-4, always including the creator).
 */
const ScorersStep = ({
  t,
  registeredParticipants,
  currentUser,
  scorerIds,
  onToggleScorer,
  isProcessing,
  onBack,
  onClose,
  onNext,
}) => (
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
                  onChange={() => onToggleScorer(p.participantId)}
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
        onClick={onBack}
        disabled={isProcessing}
        data-testid="quick-match-scorers-back"
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
      >
        {t('create.scorers.back')}
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
          onClick={onNext}
          disabled={isProcessing}
          data-testid="quick-match-scorers-next"
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {t('create.scorers.next')}
        </button>
      </div>
    </div>
  </div>
);

export default ScorersStep;
