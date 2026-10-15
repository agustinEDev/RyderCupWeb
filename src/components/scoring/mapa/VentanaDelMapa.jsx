import { Component, lazy, Suspense, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import BlockLoader from '../../ui/BlockLoader';
import ModalShell from '../../ui/ModalShell';
import { captureError } from '../../../utils/sentryHelpers';
import { hoyoDeUnaMarca } from '../../../domain/services/hoyoMarcado';
import { useMarcasDelCampo } from '../../../hooks/useMarcasDelCampo';

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

// Del código del servidor al aviso; lo que no se reconoce, el genérico
const ERROR_DE_MARCA = {
  HOLE_ALREADY_MAPPED: 'mapa.yaTieneDatos',
  HOLE_MARK_OUT_OF_RANGE: 'mapa.fueraDeLimites',
  HOLE_MARK_TOO_FAR_FROM_COURSE: 'mapa.lejosDelCampo',
  TEE_REQUIRED: 'mapa.faltaLaSalida',
};

const MapaAbierto = ({ mapaDelHoyo, golfCourseId, numeroDeHoyo, par, metros = null, userId = null }) => {
  const { t } = useTranslation('scoring');
  const [MapaDelHoyo] = useState(cargarMapa);
  const { mapaDelCampo, cerrar } = mapaDelHoyo;
  const { marcas, guardar } = useMarcasDelCampo({ golfCourseId, userId });
  const [remarcando, setRemarcando] = useState(false);

  // Lo que ya hay: el hoyo aprobado (con su green, o solo con su salida) y, si
  // le falta algo, la marca del jugador, que él ve al momento (PR C)
  const aprobado = mapaDelCampo?.holes?.[numeroDeHoyo] ?? null;
  const conSalida = (aprobado?.playLine?.length ?? 0) > 0;
  const completo = Boolean(aprobado?.green);
  const miMarca = completo || remarcando || !userId ? null : (marcas[numeroDeHoyo] ?? null);
  // Memorizado: la anotación se refresca cada 10 s, y un hoyo nuevo en cada
  // render rehacía las líneas del mapa
  const deMiMarca = useMemo(() => (miMarca ? hoyoDeUnaMarca(miMarca, aprobado) : null), [miMarca, aprobado]);
  const hoyo = completo ? aprobado : (deMiMarca ?? (conSalida ? aprobado : null));
  // Lo que falta por marcar: sin salida, salida y green; con salida, el green
  let porMarcar = null;
  if (!completo && !deMiMarca && userId) porMarcar = conSalida ? 'green' : 'salida';

  // La atribución, si algo de lo que se ve sale del mapa (y no todo de la marca)
  const usaElMapa = completo || (conSalida && !miMarca?.tee);

  // En cuanto está en el móvil el mapa se rehace con el hoyo marcado; si luego
  // el servidor no la quiere, se dice aquí (el mapa ya es otro) y vuelve la de antes
  const guardarMarca = async (datos) => {
    setRemarcando(false);
    const resultado = await guardar({ holeNumber: numeroDeHoyo, ...datos });
    if (resultado.estado === 'rechazada') toast.error(t(ERROR_DE_MARCA[resultado.errorCode] ?? 'mapa.noSeGuardo'));
    return resultado;
  };
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
          key={`${numeroDeHoyo}-${mapaDelCampo?.version ?? 'sin-mapa'}-${hoyo ? 'con' : 'sin'}-${deMiMarca ? miMarca.markedAt : (porMarcar ?? '')}`}
          golfCourseId={golfCourseId}
          numeroDeHoyo={numeroDeHoyo}
          par={par}
          hoyo={hoyo}
          atribucion={usaElMapa ? (mapaDelCampo?.attribution ?? null) : null}
          onCerrar={cerrar}
          metros={metros}
          porMarcar={porMarcar}
          onGuardarMarca={porMarcar ? guardarMarca : null}
          onVolverAMarcar={deMiMarca ? () => setRemarcando(true) : null}
          // Volviendo a marcar, «Ahora no» devuelve la marca que ya había
          onAhoraNo={remarcando ? () => setRemarcando(false) : null}
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
