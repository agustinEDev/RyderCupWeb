import { Component, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import BlockLoader from '../../ui/BlockLoader';
import { captureError } from '../../../utils/sentryHelpers';

// Aparte: MapLibre pesa, y la anotación no tiene por qué cargarlo hasta que se abre
const MapaDelHoyo = lazy(() => import('./MapaDelHoyo'));

const NoCarga = ({ onCerrar }) => {
  const { t } = useTranslation('scoring');
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gray-900 p-6 text-center text-white">
      <p>{t('mapa.noCarga')}</p>
      <button type="button" onClick={onCerrar} className="min-h-11 rounded-xl bg-white px-5 font-semibold text-gray-900">
        {t('mapa.cerrar')}
      </button>
    </div>
  );
};

/** De un modal se sale siempre: si el mapa no carga, un aviso con «Cerrar». */
class SiNoCarga extends Component {
  constructor(props) {
    super(props);
    this.state = { fallo: false };
  }

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error) {
    captureError(error, { tags: { modulo: 'mapa-de-hoyos' } });
  }

  render() {
    return this.state.fallo ? <NoCarga onCerrar={this.props.onCerrar} /> : this.props.children;
  }
}

/**
 * El mapa del hoyo cuando está abierto (BE #532), con los datos de ese hoyo
 * sacados del mapa del campo; sin mapa del campo, el hoyo va como sin mapa.
 */
const VentanaDelMapa = ({ mapaDelHoyo, golfCourseId, numeroDeHoyo, par }) => {
  if (!mapaDelHoyo.abierto) return null;
  const { mapaDelCampo, cerrar } = mapaDelHoyo;
  return (
    <SiNoCarga onCerrar={cerrar}>
      <Suspense
        fallback={
          <div role="dialog" aria-modal="true" aria-busy="true" className="fixed inset-0 z-50 flex items-center justify-center bg-white">
            <BlockLoader />
          </div>
        }
      >
        <MapaDelHoyo
          golfCourseId={golfCourseId}
          numeroDeHoyo={numeroDeHoyo}
          par={par}
          hoyo={mapaDelCampo?.holes?.[numeroDeHoyo] ?? null}
          atribucion={mapaDelCampo?.attribution ?? null}
          onCerrar={cerrar}
        />
      </Suspense>
    </SiNoCarga>
  );
};

export default VentanaDelMapa;
