import { useTranslation } from 'react-i18next';

import TeeColor from '../../domain/value_objects/TeeColor';

/**
 * TeeColorBadge Component
 *
 * Muestra una salida con el color real de sus barras y, opcionalmente, el
 * género. El color se pinta a partir del propio color de la salida, no de una
 * clasificación: unas barras verdes se ven verdes.
 */
const TeeColorBadge = ({ color, identifier, gender }) => {
  const { t } = useTranslation('golfCourses');

  const swatch = TeeColor.swatchFor(color);
  const label = identifier || t(`form.colors.${color}`, { defaultValue: color });
  const genderSuffix = gender === 'MALE' ? ' (M)' : gender === 'FEMALE' ? ' (F)' : '';

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-50 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600">
      <span
        aria-hidden="true"
        className="inline-block w-2.5 h-2.5 rounded-full border border-black/20"
        style={{ backgroundColor: swatch }}
      />
      {label}
      {genderSuffix}
    </span>
  );
};

export default TeeColorBadge;
