import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ValidationIcon from './ValidationIcon';

const HoleInput = ({
  holeNumber,
  par,
  strokeIndex,
  playerScore,
  validationStatus,
  netScore,
  strokesReceived,
  holeResult,
  standing,
  isReadOnly = false,
  onScoreChange,
}) => {
  const { t } = useTranslation('scoring');
  // Parent passes key={holeNumber} so component remounts with fresh state on hole change
  const [ownValue, setOwnValue] = useState(playerScore?.ownScore ?? par);
  const [markedValue, setMarkedValue] = useState(playerScore?.markerScore ?? par);

  const adjustScore = (current, delta) => {
    if (current === null) return 1;
    const next = current + delta;
    if (next < 1) return null; // picked up
    if (next > 9) return 9;
    return next;
  };

  const handleOwnChange = (delta) => {
    const next = adjustScore(ownValue, delta);
    setOwnValue(next);
    if (onScoreChange) onScoreChange({ ownScore: next, markedScore: markedValue });
  };

  const handleMarkedChange = (delta) => {
    const next = adjustScore(markedValue, delta);
    setMarkedValue(next);
    if (onScoreChange) onScoreChange({ ownScore: ownValue, markedScore: next });
  };

  const displayScore = (val) => val === null ? '-' : val;

  return (
    <div data-testid="hole-input" className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900">{t('input.hole')} {holeNumber}</span>
          <span className="text-sm text-gray-500">{t('input.par')} {par}</span>
          <span className="text-sm text-gray-500">{t('input.strokeIndex')} {strokeIndex}</span>
          {strokesReceived > 0 && (
            <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
              {t('input.strokeReceived')}
            </span>
          )}
        </div>
        <ValidationIcon status={validationStatus || 'pending'} />
      </div>

      {!isReadOnly && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">{t('input.yourScore')}</label>
            <div className="flex items-center gap-2">
              <button
                data-testid="own-score-minus"
                onClick={() => handleOwnChange(-1)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 text-lg font-bold"
              >
                -
              </button>
              <span data-testid="own-score-value" className="w-8 text-center text-xl font-bold">
                {displayScore(ownValue)}
              </span>
              <button
                data-testid="own-score-plus"
                onClick={() => handleOwnChange(1)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">{t('input.markerScore')}</label>
            <div className="flex items-center gap-2">
              <button
                data-testid="marked-score-minus"
                onClick={() => handleMarkedChange(-1)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 text-lg font-bold"
              >
                -
              </button>
              <span data-testid="marked-score-value" className="w-8 text-center text-xl font-bold">
                {displayScore(markedValue)}
              </span>
              <button
                data-testid="marked-score-plus"
                onClick={() => handleMarkedChange(1)}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 text-lg font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {isReadOnly && playerScore && (
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">{t('input.yourScore')}</p>
            <p className="text-xl font-bold">{displayScore(playerScore.ownScore)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('input.markerScore')}</p>
            <p className="text-xl font-bold">{displayScore(playerScore.markerScore)}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
        {netScore !== null && netScore !== undefined && (
          <span className="text-gray-600">{t('input.netScore')}: <strong>{netScore}</strong></span>
        )}
        {holeResult && (
          <span className="text-gray-600">
            {holeResult.winner === 'HALVED' ? t('input.halved') : holeResult.winner}
          </span>
        )}
        {standing && (
          <span className="font-medium text-primary">
            {standing === 'AS' ? t('input.allSquare') : standing}
          </span>
        )}
      </div>
    </div>
  );
};

export default HoleInput;
