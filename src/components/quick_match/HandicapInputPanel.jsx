import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_HANDICAP, MIN_HANDICAP } from '../../domain/services/handicapRange';

const KEYPAD_DIGITS = [7, 8, 9, 4, 5, 6, 1, 2, 3];

/**
 * Bottom-sheet numeric keypad for entering a handicap (-10.0 to 54.0, one
 * decimal place) — same bottom-sheet pattern as `scoring/ScoreInputPanel`,
 * adapted for decimals/negatives instead of golf scores 1-15 (a plain
 * `<input type="number">` renders inconsistent spinners/decimal separators
 * across browsers and is fiddly on mobile).
 */
const HandicapInputPanel = ({ value, onConfirm, onClose, label }) => {
  const { t } = useTranslation('quickMatch');
  const [input, setInput] = useState(value != null ? String(value) : '');

  const isEmpty = input === '';
  const parsed = isEmpty || input === '-' || input.endsWith('.') ? null : Number(input);
  const isOutOfRange = parsed !== null && (parsed < MIN_HANDICAP || parsed > MAX_HANDICAP);
  const canConfirm = isEmpty || (parsed !== null && !Number.isNaN(parsed) && !isOutOfRange);

  const appendDigit = (digit) => {
    setInput((prev) => {
      const decimals = prev.split('.')[1];
      if (decimals && decimals.length >= 1) return prev;
      return prev + digit;
    });
  };

  const appendDecimalPoint = () => {
    setInput((prev) => {
      if (prev.includes('.')) return prev;
      return prev === '' || prev === '-' ? `${prev}0.` : `${prev}.`;
    });
  };

  const toggleSign = () => {
    setInput((prev) => (prev.startsWith('-') ? prev.slice(1) : `-${prev}`));
  };

  const backspace = () => setInput((prev) => prev.slice(0, -1));

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(isEmpty ? null : parsed);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="bg-white rounded-t-2xl w-full max-w-md p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-600 truncate">{label}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('create.handicapPanel.close')}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div
          data-testid="handicap-panel-display"
          className={`mb-1 h-14 flex items-center justify-center rounded-xl border text-2xl font-bold ${
            isOutOfRange ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-200 text-gray-900'
          }`}
        >
          {isEmpty ? (
            <span className="text-base font-normal text-gray-400">{t('create.handicapPanel.placeholder')}</span>
          ) : (
            input
          )}
        </div>
        <p className="text-xs text-red-600 text-center mb-3 h-4">
          {isOutOfRange && t('create.handicapPanel.errorRange')}
        </p>

        <div className="grid grid-cols-3 gap-2 mb-2">
          {KEYPAD_DIGITS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => appendDigit(String(n))}
              className="h-12 rounded-xl bg-gray-100 text-gray-800 text-xl font-bold hover:bg-gray-200 active:bg-gray-300 transition-colors"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={toggleSign}
            aria-label={t('create.handicapPanel.toggleSign')}
            className="h-12 rounded-xl bg-gray-100 text-gray-800 text-xl font-bold hover:bg-gray-200 active:bg-gray-300 transition-colors"
          >
            +/-
          </button>
          <button
            type="button"
            onClick={() => appendDigit('0')}
            className="h-12 rounded-xl bg-gray-100 text-gray-800 text-xl font-bold hover:bg-gray-200 active:bg-gray-300 transition-colors"
          >
            0
          </button>
          <button
            type="button"
            onClick={appendDecimalPoint}
            className="h-12 rounded-xl bg-gray-100 text-gray-800 text-xl font-bold hover:bg-gray-200 active:bg-gray-300 transition-colors"
          >
            .
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={backspace}
            disabled={isEmpty}
            aria-label={t('create.handicapPanel.backspace')}
            data-testid="handicap-panel-backspace"
            className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            data-testid="handicap-panel-confirm"
            className="flex-[2] h-12 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {t('create.handicapPanel.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HandicapInputPanel;
