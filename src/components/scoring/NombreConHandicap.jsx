import { useTranslation } from 'react-i18next';
import { formatoDeHandicapDeJuego } from '../../utils/formatoDeHandicap';

/**
 * El nombre con su hándicap de juego al lado (QA del 21 oct 2026): la tabla de
 * match play y las tarjetas de stroke play lo pintan igual.
 *
 * A la vista «HCP 12»: «Hcp de juego 12» partía en dos líneas la cabecera de la
 * pareja en el móvil y ensanchaba la columna del nombre en el ordenador. El
 * lector de pantalla oye el largo, que «HCP» deletreado no dice nada. El valor
 * no se encoge: si no cabe, se corta el nombre (lo decide `nombreClassName`).
 *
 * @param {Object} props
 * @param {string} props.userId
 * @param {string} props.nombre
 * @param {number|null} [props.playingHandicap] Sin valor, solo el nombre
 * @param {string} [props.className] La caja de los dos
 * @param {string} [props.nombreClassName] El nombre
 * @param {string} [props.testId] El de la caja
 */
const NombreConHandicap = ({ userId, nombre, playingHandicap, className, nombreClassName, testId }) => {
  const { t } = useTranslation('scoring');
  const valor = formatoDeHandicapDeJuego(playingHandicap);
  return (
    <span data-testid={testId} className={className}>
      <span className={nombreClassName}>{nombre}</span>
      {valor !== null && (
        <span
          data-testid={`hcp-de-juego-${userId}`}
          className="ml-1 shrink-0 whitespace-nowrap text-[10px] font-normal text-gray-500"
        >
          <span aria-hidden="true">{t('scorecard.playingHandicapShort', { value: valor })}</span>
          <span className="sr-only">{t('scorecard.playingHandicap', { value: valor })}</span>
        </span>
      )}
    </span>
  );
};

export default NombreConHandicap;
