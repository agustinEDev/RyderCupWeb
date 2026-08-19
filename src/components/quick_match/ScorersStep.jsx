import { MAX_SCORERS, oppositeTeam } from './createQuickMatchModalConstants';

/**
 * En foursomes apuntan las dos parejas cuando hay algun anotador del bando de
 * enfrente; si no, la tarjeta la lleva entera la pareja de quien crea.
 *
 * El bando de enfrente es la OTRA letra, no "cualquiera que no sea el mio": un
 * registrado sin equipo no juega en ninguna de las dos parejas y bastaba con
 * que estuviera entre los anotadores para dar por elegidas las dos.
 */
const bothPairsScore = (registeredParticipants, currentUser, scorerIds) => {
  const myTeam =
    registeredParticipants.find((p) => p.userId === currentUser?.id)?.team ?? null;
  const rivalTeam = oppositeTeam(myTeam);
  return registeredParticipants.some(
    (p) => (p.team ?? null) === rivalTeam && scorerIds.includes(p.participantId)
  );
};

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
  isFoursomes = false,
  rivalCanScore = false,
  partnerCanScore = false,
  onChooseScoringSides = () => {},
  isProcessing,
  onBack,
  onClose,
  onNext,
}) => (
  <div className="p-4 space-y-4">
    {isFoursomes ? (
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-1">
          {t('create.scorers.foursomesHeading')}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {t(
            partnerCanScore
              ? 'create.scorers.foursomesDescription'
              : 'create.scorers.foursomesDescriptionAlone'
          )}
        </p>
        <div className="space-y-2">
          {rivalCanScore && (
            <button
              type="button"
              data-testid="quick-match-scorers-both-pairs"
              aria-pressed={bothPairsScore(registeredParticipants, currentUser, scorerIds)}
              onClick={() => onChooseScoringSides('BOTH')}
              className={`w-full text-left px-3 py-2 border rounded-lg transition-colors ${
                bothPairsScore(registeredParticipants, currentUser, scorerIds)
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="block text-sm text-gray-900">{t('create.scorers.bothPairs')}</span>
              <span className="block text-xs text-gray-500">{t('create.scorers.bothPairsHint')}</span>
            </button>
          )}
          <button
            type="button"
            data-testid="quick-match-scorers-my-pair"
            aria-pressed={!bothPairsScore(registeredParticipants, currentUser, scorerIds)}
            onClick={() => onChooseScoringSides('MINE')}
            className={`w-full text-left px-3 py-2 border rounded-lg transition-colors ${
              bothPairsScore(registeredParticipants, currentUser, scorerIds)
                ? 'border-gray-200 hover:border-gray-300'
                : 'border-primary bg-primary/5'
            }`}
          >
            <span className="block text-sm text-gray-900">{t('create.scorers.onlyMyPair')}</span>
            <span className="block text-xs text-gray-500">
              {t(
                partnerCanScore
                  ? 'create.scorers.onlyMyPairHint'
                  : 'create.scorers.onlyMyPairHintAlone'
              )}
            </span>
          </button>
        </div>
      </div>
    ) : (
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
    )}

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
