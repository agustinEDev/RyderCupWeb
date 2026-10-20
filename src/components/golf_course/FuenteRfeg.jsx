import { useTranslation } from 'react-i18next';

export const URL_RFEG = 'https://www.rfegolf.es';

/**
 * Cita a la RFEG como fuente de los datos de un campo federado (auditoría legal
 * del 20 oct 2026). Quien decide si se pinta es quien la usa, preguntando al
 * campo con `isFromRfeg()`: aquí solo se dice.
 *
 * - `ficha`: «Datos del recorrido: Real Federación Española de Golf (RFEG)», en
 *   el detalle de un campo.
 * - `linea`: «Datos de campos federados: RFEG», discreta, donde se eligen campo
 *   y barras.
 *
 * @param {Object} props
 * @param {'ficha'|'linea'} [props.variante]
 * @param {string} [props.className]
 */
const FuenteRfeg = ({ variante = 'linea', className = '' }) => {
  const { t } = useTranslation('golfCourses');
  const esFicha = variante === 'ficha';

  return (
    <p className={`text-xs text-gray-500 break-words ${className}`}>
      {t(esFicha ? 'source.courseData' : 'source.federatedData')}{' '}
      <a href={URL_RFEG} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
        {t(esFicha ? 'source.rfegName' : 'source.rfegShort')}
      </a>
    </p>
  );
};

export default FuenteRfeg;
