import { Component, lazy, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BlockLoader from '../../ui/BlockLoader';
import ModalShell from '../../ui/ModalShell';
import { captureError } from '../../../utils/sentryHelpers';
import { esElEcoDeLaRecarga } from '../../../utils/recargaPorTrozoViejo';
import { hoyoDeUnaMarca } from '../../../domain/services/hoyoMarcado';
import { useMuestrasDelCampo } from '../../../hooks/useMuestrasDelCampo';
import { useReportarHoyo } from '../../../hooks/useReportarHoyo';
import { useBarrasNegras } from '../../../hooks/useBarrasNegras';

// Aparte: MapLibre pesa, y la anotación no tiene por qué cargarlo hasta que se
// abre. Una carga nueva en cada apertura: React guarda la que falló, y con una
// sola, tras un fallo el mapa ya no abría hasta recargar la página
const cargarMapa = () => lazy(() => import('./MapaDelHoyo'));

// La caja de `ModalShell` (que ya se anuncia como diálogo), a toda la pantalla
const CAPA = 'fixed inset-x-0 inset-y-0 flex flex-col items-center justify-center gap-4 p-6 text-center';

/**
 * De un modal se sale siempre: también mientras carga y si no carga. En negro,
 * como el mapa y las barras del sistema (19 oct), con «Cerrar» en blanco.
 */
const SalidaDelMapa = ({ onCerrar, children }) => {
  const { t } = useTranslation('scoring');
  return (
    <ModalShell isOpen onClose={onCerrar} closeOnBackdrop={false} boxClassName={`${CAPA} espera-sobre-oscuro bg-black text-white`}>
      <button type="button" onClick={onCerrar} className="min-h-11 order-last rounded-xl bg-white px-5 font-semibold text-gray-900">
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

  static getDerivedStateFromError(error) {
    // Recargando por un trozo viejo, el mapa no falló: llega el build nuevo
    return { fallo: true, recargando: esElEcoDeLaRecarga(error) };
  }

  componentDidCatch(error) {
    if (this.state.recargando) return;
    captureError(error, { tags: { modulo: 'mapa-de-hoyos' } });
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    // De un modal se sale siempre: también mientras llega la recarga
    return (
      <SalidaDelMapa onCerrar={this.props.onCerrar}>
        <p>{this.state.recargando ? this.props.textoRecargando : this.props.texto}</p>
      </SalidaDelMapa>
    );
  }
}

// Un hoyo del que aún no se sabe nada: sin muestra, y recogiendo
const SIN_MUESTRAS = { guardada: null, primera: null, green: null, recoge: true };
const conSalida = (muestra) => Boolean(muestra?.tee);
const mismoPunto = (a, b) => Boolean(a && b) && a.lat === b.lat && a.lon === b.lon;

const MapaAbierto = ({ mapaDelHoyo, golfCourseId, numeroDeHoyo, par, metros = null, userId = null, barra = null }) => {
  const { t } = useTranslation('scoring');
  const [MapaDelHoyo] = useState(cargarMapa);
  const { mapaDelCampo, cerrar } = mapaDelHoyo;
  const { muestras, pendientes, enviar } = useMuestrasDelCampo({ golfCourseId, userId, barra });
  // Reportar un hoyo (entrega 7): basta la sesión, no hace falta la barra
  const reportar = useReportarHoyo({ golfCourseId, userId });
  // Las barras del sistema en negro desde que se abre: también mientras carga
  // el mapa y si no carga (19 oct)
  useBarrasNegras();

  // Lo que se ve, por orden (17 oct, una referencia por hoyo): la línea que
  // guardó el admin; si no, el hoyo aprobado con su green; si no, la primera
  // muestra completa del hoyo; si no, el green
  // de una muestra solo green (y se pide la salida hasta él); si no, la que este
  // jugador dejó en el móvil (completa, o solo su green); si no, lo aprobado que
  // haya (solo la salida) o nada
  const delHoyo = muestras[numeroDeHoyo] ?? SIN_MUESTRAS;
  const guardada = delHoyo.guardada ?? null;
  // Con la línea del admin, lo del mapa no se usa
  const aprobado = guardada ? null : (mapaDelCampo?.holes?.[numeroDeHoyo] ?? null);
  const aprobadoConSalida = (aprobado?.playLine?.length ?? 0) > 0;
  const completo = Boolean(aprobado?.green);
  const mia = pendientes[numeroDeHoyo] ?? null;
  // Mi línea completa que acaba en el green suelto es la que lo completa: va
  // antes que él, o al reabrir no la vería (revisión, 17 oct)
  const miaLoCompleta = conSalida(mia) && mismoPunto(mia.greenCenter, delHoyo.green);
  const muestra = guardada ?? delHoyo.primera ?? (miaLoCompleta || (!delHoyo.green && conSalida(mia)) ? mia : null);
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
    // Con los metros: la salida se coloca con ellos al abrir (V2)
    clave: `${numeroDeHoyo}-${mapaDelCampo?.version ?? 'sin-mapa'}-${metros ?? 'sin-metros'}-${hoyo ? 'con' : 'sin'}-${!completo && deCualMuestra ? `muestra:${deCualMuestra}` : (porMarcar ?? '')}`,
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
    <SiNoCarga onCerrar={cerrar} texto={t('mapa.noCarga')} textoRecargando={t('mapa.actualizando')}>
      <Suspense
        fallback={
          <SalidaDelMapa onCerrar={cerrar}>
            <BlockLoader tinta="blanco" />
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
          recoge={delHoyo.recoge && !guardada}
          // Mi propia línea (de este móvil) no se mueve a mis metros: ya es mía
          colocarSalida={!(muestra && muestra === mia)}
          onMuestra={puedeEnviar ? (datos) => enviar(numeroDeHoyo, datos) : null}
          onEmpezar={() => setCongelado((c) => c ?? ahora)}
          onReporte={reportar ? (datos) => reportar(numeroDeHoyo, datos) : null}
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
