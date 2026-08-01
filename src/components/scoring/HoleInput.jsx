import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ValidationIcon from './ValidationIcon';
import ScoreInputPanel from './ScoreInputPanel';

const HoleInput = ({
  holeNumber,
  par,
  strokeIndex,
  playerScore,
  markedPlayerScore,
  validationStatus,
  netScore,
  strokesReceived,
  holeResult,
  standing,
  isReadOnly = false,
  isOwnScoreLocked = false,
  isMarkerScoreLocked = false,
  onScoreChange,
  teamAName,
  teamBName,
}) => {
  const { t } = useTranslation('scoring');
  // undefined = hole not scored yet (nothing persisted); null = explicitly picked up.
  const [ownValue, setOwnValue] = useState(
    playerScore?.ownSubmitted ? playerScore.ownScore : undefined
  );
  const [markedValue, setMarkedValue] = useState(
    markedPlayerScore?.markerSubmitted ? markedPlayerScore.markerScore : undefined
  );
  const [openPanel, setOpenPanel] = useState(null); // 'own' | 'marked' | null

  const handleOwnSelect = (val) => {
    if (isReadOnly || isOwnScoreLocked) return;
    setOwnValue(val);
    setOpenPanel(null);
    if (onScoreChange) onScoreChange({ ownScore: val, markedScore: markedValue });
  };

  const handleMarkedSelect = (val) => {
    if (isReadOnly || isMarkerScoreLocked) return;
    setMarkedValue(val);
    setOpenPanel(null);
    if (onScoreChange) onScoreChange({ ownScore: ownValue, markedScore: val });
  };

  const displayScore = (val, ariaLabelNull = null) => {
    if (val === undefined) return <span aria-label={t('input.notEntered')}>-</span>;
    return val === null
      ? <span aria-label={ariaLabelNull || undefined}>-</span>
      : val;
  };

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
          {/* Own score */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">{t('input.yourScore')}</label>
            {!isOwnScoreLocked ? (
              <button
                data-testid="own-score-button"
                onClick={() => setOpenPanel('own')}
                className={`w-full h-12 flex items-center justify-center rounded-xl transition-colors ${
                  ownValue === undefined
                    ? 'bg-white border-2 border-dashed border-gray-300 hover:border-gray-400'
                    : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <span
                  data-testid="own-score-value"
                  className={`text-2xl font-bold ${ownValue === undefined ? 'text-gray-400' : 'text-gray-900'}`}
                >
                  {displayScore(ownValue, t('input.pickedUp'))}
                </span>
              </button>
            ) : (
              <p data-testid="own-score-value" className="h-12 flex items-center justify-center text-2xl font-bold text-gray-400">
                {displayScore(ownValue, t('input.pickedUp'))}
              </p>
            )}
          </div>

          {/* Marker score */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">{t('input.markerScore')}</label>
            {!isMarkerScoreLocked ? (
              <button
                data-testid="marked-score-button"
                onClick={() => setOpenPanel('marked')}
                className={`w-full h-12 flex items-center justify-center rounded-xl transition-colors ${
                  markedValue === undefined
                    ? 'bg-white border-2 border-dashed border-gray-300 hover:border-gray-400'
                    : 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <span
                  data-testid="marked-score-value"
                  className={`text-2xl font-bold ${markedValue === undefined ? 'text-gray-400' : 'text-gray-900'}`}
                >
                  {displayScore(markedValue, t('input.pickedUp'))}
                </span>
              </button>
            ) : (
              <p data-testid="marked-score-value" className="h-12 flex items-center justify-center text-2xl font-bold text-gray-400">
                {displayScore(markedValue, t('input.pickedUp'))}
              </p>
            )}
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
            {holeResult.winner === 'HALVED'
              ? t('input.halved')
              : holeResult.winner === 'A' ? (teamAName || 'A') : holeResult.winner === 'B' ? (teamBName || 'B') : holeResult.winner}
          </span>
        )}
        {standing && (
          <span className="font-medium text-primary">
            {standing === 'AS'
              ? t('input.allSquare')
              : `${holeResult?.standingTeam === 'A' ? (teamAName || 'A') : holeResult?.standingTeam === 'B' ? (teamBName || 'B') : ''} ${standing}`}
          </span>
        )}
      </div>

      {openPanel === 'own' && (
        <ScoreInputPanel
          value={ownValue}
          onSelect={handleOwnSelect}
          onClose={() => setOpenPanel(null)}
          label={t('input.yourScore')}
          par={par}
        />
      )}
      {openPanel === 'marked' && (
        <ScoreInputPanel
          value={markedValue}
          onSelect={handleMarkedSelect}
          onClose={() => setOpenPanel(null)}
          label={t('input.markerScore')}
          par={par}
        />
      )}
    </div>
  );
};

export default HoleInput;
