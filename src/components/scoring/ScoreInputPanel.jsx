import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const MAX_SCORE = 15;

/**
 * Bottom-sheet numpad for picking a hole score (1-9, custom, or picked up).
 * Extracted out of HoleInput so it can be reused by any score entry surface
 * (tournament scoring and quick match scoring share the exact same picker).
 */
const ScoreInputPanel = ({ value, onSelect, onClose, label, par }) => {
  const { t } = useTranslation('scoring');
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const getScoreLabel = (n) => {
    if (!par) return null;
    const diff = n - par;
    if (diff === -2) return t('input.scoreEagle');
    if (diff === -1) return t('input.scoreBirdie');
    if (diff === 0) return t('input.par');
    if (diff === 1) return t('input.scoreBogey');
    if (diff === 2) return t('input.scoreDouble');
    return null;
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

export default ScoreInputPanel;
