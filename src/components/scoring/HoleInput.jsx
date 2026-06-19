import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ValidationIcon from './ValidationIcon';

const MAX_SCORE = 15;

const ScoreInputPanel = ({ value, onSelect, onClose, label, par }) => {
  const { t } = useTranslation('scoring');
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const getScoreLabel = (n) => {
    if (!par) return null;
    if (n === 1) return t('input.scoreAce');
    const diff = n - par;
    if (diff < -2) return `${diff}`;
    if (diff === -2) return t('input.scoreEagle');
    if (diff === -1) return t('input.scoreBirdie');
    if (diff === 0) return t('input.par');
    if (diff === 1) return t('input.scoreBogey');
    if (diff === 2) return t('input.scoreDouble');
    if (diff === 3) return t('input.scoreTriple');
    return `+${diff}`;
  };

  const handleCustomConfirm = () => {
    const trimmed = customInput.trim();
    const num = Number(trimmed);
    if (Number.isInteger(num) && String(num) === trimmed && num >= 1 && num <= MAX_SCORE) {
      onSelect(num);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="bg-white rounded-t-2xl w-full max-w-md p-4 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-600">{label}</span>
          <button
            onClick={onClose}
            aria-label={t('input.close')}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {!customMode ? (
          <>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                const label = getScoreLabel(n);
                return (
                  <button
                    key={n}
                    onClick={() => onSelect(n)}
                    className={`h-14 rounded-xl transition-colors flex flex-col items-center justify-center leading-none gap-0.5 ${
                      value === n
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300'
                    }`}
                  >
                    <span className="text-xl font-bold">{n}</span>
                    {label && (
                      <span className="text-[10px] font-medium opacity-70 leading-none">{label}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              <button
                data-testid="picked-up-button"
                onClick={() => onSelect(null)}
                className={`h-12 w-full rounded-xl transition-colors flex flex-col items-center justify-center leading-none ${
                  value === null
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <span className="text-xl font-bold">-</span>
                <span className="text-xs font-medium opacity-75">{t('input.pickedUpLabel')}</span>
              </button>
              <button
                onClick={() => setCustomMode(true)}
                className="h-12 w-full rounded-xl text-base font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
              >
                {t('input.customScore')}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">{t('input.enterCustomScore')}</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                max={MAX_SCORE}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button
                onClick={handleCustomConfirm}
                aria-label={t('input.confirmScore')}
                className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
              >
                ✓
              </button>
              <button
                onClick={() => { setCustomMode(false); setCustomInput(''); }}
                aria-label={t('input.back')}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                ←
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [ownValue, setOwnValue] = useState(
    playerScore?.ownScore !== undefined ? playerScore.ownScore : par
  );
  const [markedValue, setMarkedValue] = useState(
    markedPlayerScore?.markerScore !== undefined ? markedPlayerScore.markerScore : par
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

  const displayScore = (val, ariaLabelNull = null) =>
    val == null
      ? <span aria-label={ariaLabelNull || undefined}>-</span>
      : val;

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
                className="w-full h-12 flex items-center justify-center bg-gray-100 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                <span data-testid="own-score-value" className="text-2xl font-bold text-gray-900">
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
                className="w-full h-12 flex items-center justify-center bg-gray-100 rounded-xl hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                <span data-testid="marked-score-value" className="text-2xl font-bold text-gray-900">
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
