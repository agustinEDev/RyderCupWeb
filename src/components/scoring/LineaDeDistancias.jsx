import { useTranslation } from 'react-i18next';
import { distanciasAlGreen } from '../../domain/services/distanciasAlGreen';

/**
 * La línea de distancias al green, al pie de la tarjeta del hoyo (BE #532).
 *
 * Una sola línea: la anotación sigue siendo lo primero. Sin green (campo sin
 * mapa, u hoyo sin marcar) no aparece, y la tarjeta queda como siempre.
 */
const LineaDeDistancias = ({ green, activadas, gps, onActivar }) => {
  const { t } = useTranslation('scoring');
  if (!green) return null;

  if (!activadas) {
    return (
      <button
        type="button"
        onClick={onActivar}
        className="text-sm font-semibold text-primary bg-green-50 hover:bg-green-100 rounded-lg px-3 py-1.5"
      >
        {t('distancias.activar')}
      </button>
    );
  }

  const aviso = {
    buscando: t('distancias.buscando'),
    denegado: t('distancias.denegado'),
    'no-disponible': t('distancias.noDisponible'),
  }[gps.estado];
  if (aviso) {
    return <p className={`text-sm ${gps.estado === 'buscando' ? 'text-amber-700' : 'text-gray-500'}`}>{aviso}</p>;
  }

  const distancias = distanciasAlGreen(gps.posicion, green);
  if (!distancias) return null;
  return (
    <p
      data-testid="distancias-del-hoyo"
      aria-label={t('distancias.etiqueta', distancias)}
      className="inline-flex items-baseline gap-3 rounded-lg bg-green-50 px-3 py-1.5 font-mono tabular-nums text-sm text-gray-900"
    >
      <span><span className="text-xs text-gray-500">{t('distancias.delante')}</span> <strong>{distancias.front}</strong></span>
      <span data-testid="distancia-centro" className="text-base">
        <span className="text-xs text-gray-500">{t('distancias.centro')}</span> <strong>{distancias.center}</strong>
      </span>
      <span>
        <span className="text-xs text-gray-500">{t('distancias.fondo')}</span> <strong>{distancias.back}</strong>{' '}
        <span className="text-xs text-gray-500">m</span>
      </span>
    </p>
  );
};

export default LineaDeDistancias;
