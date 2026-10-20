import { useTranslation } from 'react-i18next';

export const URL_RFEG = 'https://www.rfegolf.es';

// Lo que va delante y el texto del enlace, por variante
const TEXTOS = {
  ficha: ['source.courseData', 'source.rfegName'],
  linea: ['source.federatedData', 'source.rfegShort'],
  handicap: ['source.prefix', 'source.rfegName'],
};

/**
 * Cita a la RFEG como fuente de los datos de un campo federado (auditoría legal
 * del 20 oct 2026). Quien decide si se pinta es quien la usa, preguntando al
 * campo con `isFromRfeg()`: aquí solo se dice.
 *
 * - `ficha`: «Datos del recorrido: Real Federación Española de Golf (RFEG)», en
 *   el detalle de un campo.
 * - `linea`: «Datos de campos federados: RFEG», discreta, donde se eligen campo
 *   y barras.
 * - `handicap`: «Fuente: Real Federación Española de Golf (RFEG)», donde se trae
 *   el hándicap de la RFEG.
 *
 * @param {Object} props
 * @param {'ficha'|'linea'|'handicap'} [props.variante]
 * @param {string} [props.className]
 */
const FuenteRfeg = ({ variante = 'linea', className = '' }) => {
  const { t } = useTranslation('golfCourses');
  const [antes, enlace] = TEXTOS[variante] ?? TEXTOS.linea;

  return (
    <p className={`text-xs text-gray-500 break-words ${className}`}>
      {t(antes)}{' '}
      <a href={URL_RFEG} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
        {t(enlace)}
      </a>
    </p>
  );
};

export default FuenteRfeg;
