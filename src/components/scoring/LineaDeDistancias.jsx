import { useTranslation } from 'react-i18next';
import { distanciasAlGreen } from '../../domain/services/distanciasAlGreen';

/**
 * La línea de distancias al green, al pie de la tarjeta del hoyo (BE #532).
 *
 * Una sola línea: la anotación sigue siendo lo primero. Sin green (campo sin
 * mapa, u hoyo sin marcar) no aparece, y la tarjeta queda como siempre.
 */
const LineaDeDistancias = ({ green, activadas, gps, atribucion = null, onActivar, onOcultar }) => {
  const { t } = useTranslation('scoring');
  if (!green) return null;

  if (!activadas) {
    return (
      <button
        type="button"
        onClick={onActivar}
        className="min-h-11 text-sm font-semibold text-primary bg-green-50 hover:bg-green-100 rounded-lg px-3"
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
    return (
      <p className={`flex flex-wrap items-center gap-x-3 text-sm ${gps.estado === 'buscando' ? 'text-amber-700' : 'text-gray-500'}`}>
        <span>{aviso}</span>
        {gps.estado === 'denegado' && onOcultar && (
          <button type="button" onClick={onOcultar} className="min-h-11 font-semibold text-primary underline">
            {t('distancias.ocultar')}
          </button>
        )}
      </p>
    );
  }

  const distancias = distanciasAlGreen(gps.posicion, green);
  if (!distancias) return null;
  return (
    <p
      data-testid="distancias-del-hoyo"
      className="inline-flex flex-wrap items-baseline gap-x-3 rounded-lg bg-green-50 px-3 py-1.5 font-mono tabular-nums text-sm text-gray-900"
    >
      {/* El lector de pantalla lee la frase; las letras sueltas, solo a la vista */}
      <span className="sr-only">{t('distancias.etiqueta', distancias)}</span>
      <span aria-hidden="true" className="inline-flex items-baseline gap-3">
        <span><span className="text-xs text-gray-500">{t('distancias.delante')}</span> <strong>{distancias.front}</strong></span>
        <span data-testid="distancia-centro" className="text-base">
          <span className="text-xs text-gray-500">{t('distancias.centro')}</span> <strong>{distancias.center}</strong>
        </span>
        <span>
          <span className="text-xs text-gray-500">{t('distancias.fondo')}</span> <strong>{distancias.back}</strong>{' '}
          <span className="text-xs text-gray-500">m</span>
        </span>
      </span>
      {/* La licencia de OSM pide citarlo donde se enseñan sus datos */}
      {atribucion && (
        <span title={atribucion} className="font-sans text-[10px] text-gray-400">
          © OSM
        </span>
      )}
    </p>
  );
};

export default LineaDeDistancias;
