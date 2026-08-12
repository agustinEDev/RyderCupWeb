import { useTranslation } from 'react-i18next';

import { teeKey, resolveTeeColor } from './createQuickMatchModalConstants';

/**
 * Button-group tee picker, shared by the creator (step 1) and each friend/guest
 * (step 2) — avoids duplicating the tee option list/styling three times. Tee
 * selection is mandatory whenever the course has tees: there's no "unspecified"
 * option, so nothing is pre-selected and the caller must validate before
 * proceeding (see handleCourseNext/handleAddFriend/handleAddGuest in
 * CreateQuickMatchModal).
 */
const TeeSelectButtons = ({ value, onChange, courseTees, ariaLabel, testIdPrefix, compact = false }) => {
  const { t } = useTranslation('golfCourses');

  const options = courseTees.map((tee) => {
    const key = teeKey(tee.color, tee.gender);
    const label = tee.identifier || t(`form.teeColors.${tee.color}`, { defaultValue: tee.color });
    return { key, label, testKey: key, color: resolveTeeColor(tee.color) };
  });

  return (
    <div
      className={`flex ${compact ? 'flex-nowrap gap-1 overflow-x-auto' : 'flex-wrap gap-2'}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          aria-pressed={value === option.key}
          data-testid={testIdPrefix ? `${testIdPrefix}-${option.testKey}` : undefined}
          className={`inline-flex items-center flex-shrink-0 rounded-md border font-medium transition-colors ${
            compact ? 'gap-1 px-2 py-1.5 text-xs' : 'gap-1.5 px-3.5 py-2 text-sm'
          } ${
            value === option.key
              ? (option.color?.selected ?? 'border-primary bg-primary/5 text-primary')
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {option.color && (
            <span
              className={`rounded-full flex-shrink-0 ${compact ? 'w-1.5 h-1.5' : 'w-2.5 h-2.5'} ${option.color.dot}`}
            />
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default TeeSelectButtons;
