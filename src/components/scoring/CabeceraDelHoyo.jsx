import { useTranslation } from 'react-i18next';
import ValidationIcon from './ValidationIcon';

/**
 * Cabecera de la casilla del hoyo: número, par, índice, golpes que se reciben
 * o se dan y la marca de TU resultado.
 *
 * @param {{
 *   holeNumber: number,
 *   par: number,
 *   strokeIndex?: number | null,
 *   strokesReceived?: number,
 *   validationStatus?: string,
 * }} props
 */
const CabeceraDelHoyo = ({
  holeNumber,
  par,
  strokeIndex,
  strokesReceived,
  validationStatus,
}) => {
  const { t } = useTranslation('scoring');
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-lg font-bold text-gray-900">
          {t('input.hole')} {holeNumber}
        </span>
        <span className="text-sm text-gray-500">
          {t('input.par')} {par}
        </span>
        {/* Las partidas de stroke play no traen el índice: sin él, ni la etiqueta (pasada, FE #824) */}
        {strokeIndex != null && (
          <span className="text-sm text-gray-500">
            {t('input.strokeIndex')} {strokeIndex}
          </span>
        )}
        {/* Cuántos: con 2 golpes decía lo mismo que con 1, y el plus que da
            golpe no veía nada (QA del 11 oct 2026) */}
        {strokesReceived > 0 && (
          <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
            {t('input.strokesReceived', { count: strokesReceived })}
          </span>
        )}
        {strokesReceived < 0 && (
          <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
            {t('input.strokesGiven', { count: -strokesReceived })}
          </span>
        )}
      </div>
      <ValidationIcon status={validationStatus || 'pending'} />
    </div>
  );
};

export default CabeceraDelHoyo;
