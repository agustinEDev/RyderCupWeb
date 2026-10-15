import { Component, lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BlockLoader from '../../ui/BlockLoader';
import ModalShell from '../../ui/ModalShell';
import { captureError } from '../../../utils/sentryHelpers';

// Aparte: MapLibre pesa, y la anotación no tiene por qué cargarlo hasta que se
// abre. Una carga nueva en cada apertura: React guarda la que falló, y con una
// sola, tras un fallo el mapa ya no abría hasta recargar la página
const cargarMapa = () => lazy(() => import('./MapaDelHoyo'));

// La caja de `ModalShell` (que ya se anuncia como diálogo), a toda la pantalla
const CAPA = 'fixed inset-x-0 inset-y-0 flex flex-col items-center justify-center gap-4 p-6 text-center';

/** De un modal se sale siempre: también mientras carga y si no carga. */
const SalidaDelMapa = ({ onCerrar, children, oscuro = false }) => {
  const { t } = useTranslation('scoring');
  return (
    <ModalShell isOpen onClose={onCerrar} closeOnBackdrop={false} boxClassName={`${CAPA} ${oscuro ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <button type="button" onClick={onCerrar} className="min-h-11 order-last rounded-xl bg-gray-900 px-5 font-semibold text-white">
        {t('mapa.cerrar')}
      </button>
      {children}
    </ModalShell>
  );
};

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
    if (!this.state.fallo) return this.props.children;
    return (
      <SalidaDelMapa onCerrar={this.props.onCerrar} oscuro>
        <p>{this.props.texto}</p>
      </SalidaDelMapa>
    );
  }
}

const MapaAbierto = ({ mapaDelHoyo, golfCourseId, numeroDeHoyo, par }) => {
  const { t } = useTranslation('scoring');
  const [MapaDelHoyo] = useState(cargarMapa);
  const { mapaDelCampo, cerrar } = mapaDelHoyo;
  const hoyo = mapaDelCampo?.holes?.[numeroDeHoyo] ?? null;
  return (
    <SiNoCarga onCerrar={cerrar} texto={t('mapa.noCarga')}>
      <Suspense
        fallback={
          <SalidaDelMapa onCerrar={cerrar}>
            <BlockLoader />
          </SalidaDelMapa>
        }
      >
        {/* Si los datos del campo llegan (o cambian) con el mapa abierto, se
            rehace con ellos: el mapa fija su encuadre y su giro al montarse */}
        <MapaDelHoyo
          key={`${numeroDeHoyo}-${mapaDelCampo?.version ?? 'sin-mapa'}-${hoyo ? 'con' : 'sin'}`}
          golfCourseId={golfCourseId}
          numeroDeHoyo={numeroDeHoyo}
          par={par}
          hoyo={hoyo}
          atribucion={mapaDelCampo?.attribution ?? null}
          onCerrar={cerrar}
        />
      </Suspense>
    </SiNoCarga>
  );
};

/**
 * El mapa del hoyo cuando está abierto (BE #532), con los datos de ese hoyo
 * sacados del mapa del campo; sin mapa del campo, el hoyo va como sin mapa.
 */
const VentanaDelMapa = (props) => (props.mapaDelHoyo.abierto ? <MapaAbierto {...props} /> : null);

export default VentanaDelMapa;
