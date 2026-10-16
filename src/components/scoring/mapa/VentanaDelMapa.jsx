import { Component, lazy, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BlockLoader from '../../ui/BlockLoader';
import ModalShell from '../../ui/ModalShell';
import { captureError } from '../../../utils/sentryHelpers';
import { hoyoDeUnaMarca } from '../../../domain/services/hoyoMarcado';
import { useMuestrasDelCampo } from '../../../hooks/useMuestrasDelCampo';

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

// Un hoyo del que aún no se sabe nada: sin muestra, y recogiendo
const SIN_MUESTRAS = { primera: null, green: null, recoge: true };
const conSalida = (muestra) => Boolean(muestra?.tee);
const mismoPunto = (a, b) => Boolean(a && b) && a.lat === b.lat && a.lon === b.lon;

const MapaAbierto = ({ mapaDelHoyo, golfCourseId, numeroDeHoyo, par, metros = null, userId = null, barra = null }) => {
  const { t } = useTranslation('scoring');
  const [MapaDelHoyo] = useState(cargarMapa);
  const { mapaDelCampo, cerrar } = mapaDelHoyo;
  const { muestras, pendientes, enviar } = useMuestrasDelCampo({ golfCourseId, userId, barra });

  // Lo que se ve, por orden (17 oct, una referencia por hoyo): el hoyo aprobado
  // con su green; si no, la primera muestra completa del hoyo; si no, el green
  // de una muestra solo green (y se pide la salida hasta él); si no, la que este
  // jugador dejó en el móvil (completa, o solo su green); si no, lo aprobado que
  // haya (solo la salida) o nada
  const aprobado = mapaDelCampo?.holes?.[numeroDeHoyo] ?? null;
  const aprobadoConSalida = (aprobado?.playLine?.length ?? 0) > 0;
  const completo = Boolean(aprobado?.green);
  const delHoyo = muestras[numeroDeHoyo] ?? SIN_MUESTRAS;
  const mia = pendientes[numeroDeHoyo] ?? null;
  // Mi línea completa que acaba en el green suelto es la que lo completa: va
  // antes que él, o al reabrir no la vería (revisión, 17 oct)
  const miaLoCompleta = conSalida(mia) && mismoPunto(mia.greenCenter, delHoyo.green);
  const muestra = delHoyo.primera ?? (miaLoCompleta || (!delHoyo.green && conSalida(mia)) ? mia : null);
  // Con la salida del mapa aprobado, se pide el green desde ella, como siempre:
  // el green suelto no la tapa (revisión, 17 oct)
  const greenSuelto = muestra || aprobadoConSalida ? null : (delHoyo.green ?? (mia && !conSalida(mia) ? mia.greenCenter : null));
  // Memorizado: la anotación se refresca cada 10 s, y un hoyo nuevo en cada
  // render rehacía las líneas del mapa
  const deLaMuestra = useMemo(
    () => (muestra ? hoyoDeUnaMarca({ tee: muestra.tee, bends: muestra.bends, greenCenter: muestra.greenCenter }) : null),
    [muestra],
  );
  const deGreenSuelto = useMemo(() => (greenSuelto ? { playLine: [], green: { center: greenSuelto } } : null), [greenSuelto]);
  const hoyo = completo ? aprobado : (deLaMuestra ?? deGreenSuelto ?? (aprobadoConSalida ? aprobado : null));
  // Sin línea, se pide: sin salida, salida y green (antes, si estás en la
  // salida); con salida, el green; con solo el green, la salida hasta él. Hace
  // falta la sesión y la barra: lo que se marca se envía con ellas
  const puedeEnviar = Boolean(userId && barra);
  let porMarcar = null;
  if (puedeEnviar && !completo && !muestra) {
    if (greenSuelto) porMarcar = 'salidaAlGreen';
    else porMarcar = aprobadoConSalida ? 'green' : 'salida';
  }
  // La atribución, si algo de lo que se ve sale del mapa (y no de una muestra)
  const usaElMapa = completo || (aprobadoConSalida && !muestra && !greenSuelto);

  // Qué muestra se ve, no solo si hay una: si llega otra (la de mi barra tras la
  // de otra), el mapa se rehace con ella mientras el jugador no haya empezado
  const deCualMuestra = muestra
    ? [muestra.tee, ...muestra.bends, muestra.greenCenter].map((p) => `${p.lat},${p.lon}`).join(';')
    : greenSuelto
      ? `green:${greenSuelto.lat},${greenSuelto.lon}`
      : '';
  const ahora = {
    clave: `${numeroDeHoyo}-${mapaDelCampo?.version ?? 'sin-mapa'}-${hoyo ? 'con' : 'sin'}-${!completo && deCualMuestra ? `muestra:${deCualMuestra}` : (porMarcar ?? '')}`,
    hoyo,
    porMarcar,
    atribucion: usaElMapa ? (mapaDelCampo?.attribution ?? null) : null,
  };
  // En cuanto el jugador empieza a marcar o a mover, lo que ve no cambia hasta
  // que cierre aunque llegue otra muestra o el mapa del campo (16 oct): rehacer
  // el mapa a mitad le quitaba lo que estaba haciendo
  const [congelado, setCongelado] = useState(null);
  const visto = congelado ?? ahora;

  return (
    <SiNoCarga onCerrar={cerrar} texto={t('mapa.noCarga')}>
      <Suspense
        fallback={
          <SalidaDelMapa onCerrar={cerrar}>
            <BlockLoader />
          </SalidaDelMapa>
        }
      >
        {/* Si los datos del campo llegan (o cambian) con el mapa abierto y el
            jugador aún no ha empezado, se rehace con ellos: el mapa fija su
            encuadre y su giro al montarse */}
        <MapaDelHoyo
          key={visto.clave}
          golfCourseId={golfCourseId}
          numeroDeHoyo={numeroDeHoyo}
          par={par}
          hoyo={visto.hoyo}
          atribucion={visto.atribucion}
          onCerrar={cerrar}
          metros={metros}
          porMarcar={visto.porMarcar}
          // Transparente para el jugador: se envía sin avisar de nada (16 oct)
          recoge={delHoyo.recoge}
          onMuestra={puedeEnviar ? (datos) => enviar(numeroDeHoyo, datos) : null}
          onEmpezar={() => setCongelado((c) => c ?? ahora)}
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
