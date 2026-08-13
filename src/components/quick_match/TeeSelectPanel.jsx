import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { teeKey, resolveTeeColor } from './createQuickMatchModalConstants';

/**
 * Bottom-sheet tee picker, opened from the + of each friend — same pattern as
 * `HandicapInputPanel` and `scoring/ScoreInputPanel`.
 *
 * Replaces the per-row picker, which put name, tees and add button on one line:
 * on a phone that left names as "Eri…" and hid 5 of 8 tees behind a horizontal
 * scrollbar, one per friend.
 *
 * Picking a tee adds the participant straight away, with no confirmation step.
 * The tee travels in the same request that adds them and there is no endpoint
 * to change it afterwards, so a mis-tap is undone by removing the participant
 * and adding them again.
 */

// Las salidas se agrupan por género porque cada jugador elige entre las suyas.
// Las mixtas van al final: un campo federado rara vez las tiene, y cuando las
// tiene son la excepción, no el caso corriente.
const GENDER_ORDER = ['MALE', 'FEMALE', null];

const GENDER_LABEL_KEY = {
  MALE: 'create.teePanel.male',
  FEMALE: 'create.teePanel.female',
  null: 'create.teePanel.mixed',
};

const TeeSelectPanel = ({ courseTees, onSelect, onClose, playerName }) => {
  const { t } = useTranslation('quickMatch');
  const { t: tCourses } = useTranslation('golfCourses');

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const groups = GENDER_ORDER
    .map((gender) => ({
      gender,
      // El género nulo llega como undefined o null según de dónde venga el tee
      tees: courseTees.filter((tee) => (tee.gender ?? null) === gender),
    }))
    .filter((group) => group.tees.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('create.teePanel.title', { name: playerName })}
        data-testid="quick-match-tee-panel"
        className="bg-white rounded-t-2xl w-full max-w-md p-4 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          {/* `truncate` no recorta nada sin `min-w-0`: sin él un nombre largo
              empujaría la cruz de cerrar fuera del panel en vez de acortarse */}
          <span className="min-w-0 truncate text-sm font-semibold text-gray-600">
            {t('create.teePanel.title', { name: playerName })}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('create.teePanel.close')}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.gender ?? 'MIXED'}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                {t(GENDER_LABEL_KEY[group.gender])}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.tees.map((tee) => {
                  const key = teeKey(tee.color, tee.gender);
                  const color = resolveTeeColor(tee.color);
                  // Dentro de un grupo el sufijo (M)/(F) sobra: el encabezado ya
                  // distingue las dos "Rojas", que es justo para lo que se
                  // añadió el sufijo en las listas donde van mezcladas
                  const name = tee.identifier || tCourses(`form.teeColors.${tee.color}`, { defaultValue: tee.color });

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSelect(key)}
                      data-testid={`quick-match-tee-panel-option-${key}`}
                      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                        color?.selected ?? 'border-gray-200 text-gray-700'
                      } hover:opacity-80`}
                    >
                      {color && (
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${color.dot}`} />
                      )}
                      <span className="min-w-0 truncate">{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeeSelectPanel;
