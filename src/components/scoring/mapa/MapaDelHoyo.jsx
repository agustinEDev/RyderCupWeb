import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, LocateFixed, Maximize2, MapPin, MoreVertical, X } from 'lucide-react';
import { Map as MapaDeMapLibre, Marker, setWorkerUrl } from 'maplibre-gl';
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import './mapa.css';
import { distanciaEnMetros } from '../../../domain/services/distanciasAlGreen';
import { PRECISION_PARA_MEDIR_M, distanciasDelHoyo, distanciasDesdeLaPosicion } from '../../../domain/services/distanciasDelHoyo';
import { encuadreGirado, limitesDelHoyo, orientacionDelHoyo, rumbo } from '../../../domain/services/geometriaDelHoyo';
import {
  MAX_CODOS,
  aCodosDelPar,
  circuloAlrededor,
  conCodosDelPar,
  lineaDeOsm,
  estaLejosDelCampo,
  hoyoDeUnaMarca,
  salidaGreenFueraDeLimites,
  salidaPorMetros,
} from '../../../domain/services/hoyoMarcado';
import { usePosicionGps } from '../../../hooks/usePosicionGps';
import { TESELAS_PNOA } from './teselas';
import { useCentroSinMapa } from '../../../hooks/useCentroSinMapa';
import { captureError } from '../../../utils/sentryHelpers';
import ModalShell from '../../ui/ModalShell';

// Empaquetado, MapLibre no encuentra solo su worker: va como fichero aparte
setWorkerUrl(urlDelWorker);

const LICENCIA_OSM = 'https://www.openstreetmap.org/copyright';

const ESTILO = {
  version: 8,
  sources: { pnoa: { type: 'raster', tiles: [TESELAS_PNOA], tileSize: 256, maxzoom: 20 } },
  layers: [
    // Sin teselas (sin cobertura), gris: el recuadro y las cifras siguen, que no dependen de ellas
    { id: 'fondo', type: 'background', paint: { 'background-color': '#6b7280' } },
    { id: 'pnoa', type: 'raster', source: 'pnoa' },
  ],
};
const ESPAÑA = { center: [-3.7, 40.4], zoom: 5 };
const DOBLE_TOQUE_MS = 400;
const ZOOM_SIN_MAPA = 17;

// Lo que tapan la cabecera y el panel de abajo, según el alto de la pantalla:
// fijo, en apaisado (~360 px) no cabía el hoyo y MapLibre no lo encuadraba.
// Abajo caben la ayuda, «Marcar hoyo», el recuadro de distancias y los
// botones: con menos, la salida de un hoyo marcado quedaba debajo
const margenDelEncuadre = (alto) => ({
  top: Math.round(Math.min(90, alto * 0.15)),
  bottom: Math.round(Math.min(320, alto * 0.45)),
  left: 40,
  right: 40,
});

// Lo que de verdad tapan la cabecera y el panel de abajo, medido, con un poco
// de aire: el hoyo, lo más grande que quepa sin cortarse (Agustín, 16 oct). Si
// no se puede medir (aún sin pintar) o no cabría nada (apaisado), los de siempre
const AIRE = 12;
// Los lados, con sitio para la muesca o las esquinas redondeadas (apaisado)
const LADOS = 40;
const margenMedido = (contenedor, arriba, abajo) => {
  const alto = contenedor?.clientHeight || 640;
  const caja = contenedor?.getBoundingClientRect?.();
  const deArriba = arriba?.getBoundingClientRect?.();
  const deAbajo = abajo?.getBoundingClientRect?.();
  if (!caja?.height || !deArriba?.height || !deAbajo?.height) return margenDelEncuadre(alto);
  const top = Math.round(deArriba.bottom - caja.top + AIRE);
  const bottom = Math.round(caja.bottom - deAbajo.top + AIRE);
  return alto - top - bottom < 120 ? margenDelEncuadre(alto) : { top, bottom, left: LADOS, right: LADOS };
};

const lngLat = (p) => [p.lon, p.lat];

const geojsonDelHoyo = (hoyo) => ({
  type: 'FeatureCollection',
  features: [
    ...(hoyo?.playLine?.length > 1
      ? [{ type: 'Feature', properties: { tipo: 'linea' }, geometry: { type: 'LineString', coordinates: hoyo.playLine.map(lngLat) } }]
      : []),
    ...(hoyo?.green
      ? [{ type: 'Feature', properties: { tipo: 'green' }, geometry: { type: 'Point', coordinates: lngLat(hoyo.green.center) } }]
      : []),
  ],
});

// La línea que se puede mover (16 oct): la que se marca o la del hoyo, con
// sus puntos arrastrables
const geojsonDeLaLinea = (linea) => ({
  type: 'FeatureCollection',
  features: linea.length > 1 ? [{ type: 'Feature', properties: { tipo: 'linea' }, geometry: { type: 'LineString', coordinates: linea.map(lngLat) } }] : [],
});
const mismoPunto = (a, b) => Boolean(a && b) && a.lat === b.lat && a.lon === b.lon;
// La línea de un hoyo con salida y green, con los codos de su par para moverlos
// (la regla, en el dominio: `lineaDeOsm`). La línea guardada no cambia, solo
// cómo se ve
const lineaParaMover = (hoyo, par) => lineaDeOsm(hoyo?.playLine, hoyo?.green?.center, par);
// Lo que se envía al cerrar: una línea que el servidor puede guardar (hasta dos
// codos, el green a 40-750 m y, si se sabe dónde está el campo, nada a más de 3 km)
const muestraValida = (linea, campo) =>
  linea.length - 2 <= MAX_CODOS &&
  !salidaGreenFueraDeLimites(linea[0], linea.at(-1)) &&
  !linea.some((p) => estaLejosDelCampo(p, campo));

// Medir tocando: de ti al punto y del punto al centro del green, cada tramo
// con sus metros al lado (Agustín, 16 oct: mejor que un cuadro aparte)
const tramosDeLaMedida = (posicion, tocado, green) =>
  [posicion && tocado ? [posicion, tocado] : null, tocado && green ? [tocado, green.center] : null].filter(Boolean);
// Sin estar en la salida, de ti al green: directa, o con el codo si lo hay
const tramosDesdeMi = (posicion, codo, green) => {
  if (!posicion || !green) return [];
  return codo ? [[posicion, codo], [codo, green.center]] : [[posicion, green.center]];
};
// A partir de aquí, la línea desde ti sale con un codo en medio (Agustín, 18 oct)
const CODO_DESDE_M = 200;
// Más lejos que esto de la salida de tu barra, estás a mitad de hoyo (Agustín, 18 oct)
const FUERA_DE_LA_SALIDA_M = 40;
const geojsonDeLaMedida = (tramos) => ({
  type: 'FeatureCollection',
  features: tramos.map(([a, b]) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [lngLat(a), lngLat(b)] } })),
});
const enMedio = (a, b) => ({ lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 });
// Los tramos de una línea de juego: de la salida al codo, de codo a codo y al green
const tramosDeLaLinea = (linea) => linea.slice(1).map((p, i) => [linea[i], p]);


const punto = (clase) => {
  const el = globalThis.document.createElement('div');
  el.className = clase;
  return el;
};

// La cifra de un tramo: amarilla la de medir, blanca la de la línea del hoyo
const etiqueta = (tipo, color) => {
  const el = punto(`rounded-md bg-gray-950/85 px-1.5 py-0.5 font-mono text-sm font-bold shadow ${color}`);
  el.dataset.tramo = tipo;
  // Las de la línea, el lector las lee juntas en una frase (más abajo)
  if (tipo === 'linea') el.setAttribute('aria-hidden', 'true');
  return el;
};
// Las cifras de unos tramos, sobre las que ya había: se mueven y se reescriben,
// no se rehacen (con cada lectura del GPS, o con el dedo al arrastrar)
const sincronizarCifras = (mapa, etiquetas, tramos, { tipo, color, texto }) => {
  while (etiquetas.length > tramos.length) etiquetas.pop().remove();
  tramos.forEach(([a, b], i) => {
    etiquetas[i] ??= new Marker({ element: etiqueta(tipo, color) }).setLngLat(lngLat(enMedio(a, b))).addTo(mapa);
    etiquetas[i].setLngLat(lngLat(enMedio(a, b)));
    etiquetas[i].getElement().textContent = texto(distanciaEnMetros(a, b));
  });
};
// Los puntos que se arrastran: la salida, los codos y el green
const CLASE_DEL_PUNTO = {
  salida: 'h-5 w-5 rounded-full border-[3px] border-gray-900 bg-white shadow',
  codo: 'h-5 w-5 rounded-full border-[3px] border-white bg-gray-900/70 shadow',
  green: 'h-5 w-5 rounded-full border-[3px] border-white bg-yellow-400 shadow',
};
const tipoDelPunto = (i, linea) => (i === 0 ? 'salida' : i === linea.length - 1 ? 'green' : 'codo');

const BOTON =
  'min-h-11 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 text-[15px] font-semibold text-gray-900 shadow-lg disabled:opacity-50';
const PLACA = 'rounded-xl bg-gray-950/85 text-white shadow-lg';
// Los motivos de un reporte, en el orden del menú (entrega 7, 18 oct)
const MOTIVOS_DEL_REPORTE = ['WRONG_HOLE', 'WRONG_LINE', 'HOLE_CHANGED'];

/**
 * El mapa del hoyo a pantalla completa (BE #532), sobre la ortofoto del PNOA.
 *
 * Con mapa del hoyo: la salida abajo y el green arriba, sin giro. El recuadro
 * de delante, centro y fondo es fijo, con los metros oficiales desde la
 * salida (16 oct). Sin mapa: norte arriba, giro libre. Siempre se mide tocando.
 * El GPS va mientras el mapa está abierto, ni antes ni después.
 *
 * La línea del hoyo (la salida, sus codos y el green) se puede mover siempre,
 * para medir. En un hoyo sin línea (17 oct) se pregunta «¿Estás en la salida?»:
 * con un sí y buen GPS, la salida es tu posición (y con un green ya puesto, la
 * línea sale sola); con mal GPS, se toca; con un no, se marca solo el green y
 * se mide desde ti. Lejos del campo o sin permiso de ubicación, sin pregunta: se
 * tocan la salida y el green. Los codos salen ya según el par. El recuadro mide
 * desde ti si el GPS es bueno y estás en el hoyo; si no, con la tarjeta. Al cerrar, si el jugador la hizo o la movió y el
 * hoyo aún recoge muestras (`recoge`), se envía con `onMuestra`, sin decírselo:
 * todo esto es transparente para él (Agustín, 16 oct).
 *
 * En un hoyo con línea, «⋮» reporta un problema (entrega 7, 18 oct): un motivo y
 * la línea que el jugador propone, que se manda con `onReporte`. Mientras, la
 * línea de siempre no se toca: es la que siguen viendo todos.
 */
const MapaDelHoyo = ({
  golfCourseId,
  numeroDeHoyo,
  par,
  hoyo,
  atribucion,
  onCerrar,
  metros = null,
  porMarcar = null,
  recoge = false,
  onMuestra = null,
  onEmpezar = null,
  colocarSalida = true,
  onReporte = null,
}) => {
  const { t } = useTranslation('scoring');
  const conMapa = orientacionDelHoyo(hoyo) !== null;
  const gps = usePosicionGps({ activo: true });
  const posicion = gps.estado === 'listo' ? gps.posicion : null;
  const precision = gps.estado === 'listo' ? (gps.precision ?? null) : null;
  // Sin permiso o sin GPS en el móvil, no hay posición que preguntar
  const sinUbicacion = gps.estado === 'denegado' || gps.estado === 'no-disponible';
  const centroSinMapa = useCentroSinMapa({ golfCourseId, activo: !conMapa });
  // Si estás en el campo: si el hoyo tiene salida (aunque no tenga green), se
  // mide desde ella; si no, desde la ubicación del campo (sin ninguna de las
  // dos, se da por hecho que sí)
  const referenciaDelCampo = hoyo?.playLine?.[0] ?? centroSinMapa ?? hoyo?.green?.center ?? null;
  // Lejos (no estás jugando): el mapa no se va a tu casa, no se mide desde ti
  // y «Céntrame» no se puede pulsar (16 oct)
  const lejos = estaLejosDelCampo(posicion, referenciaDelCampo);
  const posicionEnElCampo = lejos ? null : posicion;
  // La que vale para medir desde ti: en el campo y con el GPS bueno
  const posicionBuena = posicionEnElCampo && precision !== null && precision <= PRECISION_PARA_MEDIR_M ? posicionEnElCampo : null;
  const [tocado, setTocado] = useState(null);
  const tocadoAhora = useRef(null);
  useLayoutEffect(() => {
    tocadoAhora.current = tocado;
  }, [tocado]);
  // Sin WebGL (móviles viejos, o desactivado) no hay mapa, pero el recuadro de
  // la tarjeta sigue, que no lo necesita
  const [sinMapa, setSinMapa] = useState(false);

  const contenedor = useRef(null);
  const arriba = useRef(null);
  const abajo = useRef(null);
  const margen = useCallback(() => margenMedido(contenedor.current, arriba.current, abajo.current), []);
  const mapaRef = useRef(null);
  const marcaGps = useRef(null);
  const marcaTocada = useRef(null);
  const centradoEnGps = useRef(false);
  const movidoPorElJugador = useRef(false);
  // La línea al abrir, con la salida llevada a los metros de mi tarjeta (V2, 17
  // oct): la línea es una por hoyo, de la barra que sea. La mía (la que marqué
  // desde este móvil) no se mueve
  const [lineaInicial] = useState(() => {
    const deLaReferencia = lineaParaMover(hoyo, par);
    return colocarSalida ? salidaPorMetros(deLaReferencia, metros) : deLaReferencia;
  });
  // Lo de la primera vez, sin rehacer el mapa si cambia mientras está abierto.
  // El hoyo, con la salida que se ve: el encuadre la tiene que coger
  const inicio = useRef({
    hoyo: lineaInicial && hoyo ? { ...hoyo, playLine: lineaInicial } : hoyo,
    conMapa,
    centroSinMapa,
    soloGreen: porMarcar === 'green',
    metros,
  });

  // Marcar el hoyo: sin salida, primero se pregunta si estás en ella (17 oct);
  // con salida, se pide el green. «Ahora no» deja medir como siempre
  const preguntaPrimero = porMarcar === 'salida' || porMarcar === 'salidaAlGreen';
  const [marca, setMarca] = useState({ fase: preguntaPrimero ? 'pregunta' : porMarcar ? 'pidiendo' : null, tee: null });
  const [avisoDeMarca, setAvisoDeMarca] = useState(null);
  // «No» a «¿Estás en la salida?»: de ti al green, con el codo (`tocado`)
  // puesto una vez, en medio, si pasa de 200 m (Agustín, 18 oct). Nada de esto
  // es una muestra
  const [desdeMi, setDesdeMi] = useState(false);
  const [codoPendiente, setCodoPendiente] = useState(false);
  // En un hoyo con línea, abierto a mitad de hoyo: la línea se oculta hasta
  // «Ver hoyo» (H1, H3). Se decide una vez, con el primer GPS bueno (H4, H5)
  const [lineaOculta, setLineaOculta] = useState(false);
  const [mitadDecidida, setMitadDecidida] = useState(false);
  const [contestadoNo, setContestadoNo] = useState(0);
  // El reporte en curso (entrega 7): eligiendo el motivo, tocando la salida, el
  // green, o con la propuesta lista. Lo que había antes se guarda para volver a
  // ello: la propuesta no es una muestra
  const [reporte, setReporte] = useState(null);
  const [gracias, setGracias] = useState(false);
  const menuDeMotivos = reporte?.fase === 'motivos';
  const antesDelReporte = useRef(null);
  const botonDeReportar = useRef(null);
  const primerMotivo = useRef(null);
  const reportaba = useRef(false);
  const marcandoSalida = preguntaPrimero;
  // El green que ya trae el hoyo (de una muestra solo green): con la salida basta
  const greenConocido = porMarcar === 'salidaAlGreen' ? (hoyo?.green?.center ?? null) : null;
  // Lejos del campo o sin ubicación no se pregunta: se toca la salida (L1, 17 oct)
  const fase = marca.fase === 'pregunta' && (lejos || sinUbicacion) ? 'pidiendo' : marca.fase;
  const pidiendo = fase === 'pidiendo';
  // La línea que se ve y se mueve; `cambiada`, si el jugador la hizo o la movió.
  // `green`: el que marcó quien no está en la salida (solo green, sin línea)
  const [edicion, setEdicion] = useState(() => ({ linea: lineaInicial, green: null, cambiada: false, version: 0 }));
  const [conAyudaDeCodos, setConAyudaDeCodos] = useState(false);
  const linea = edicion.linea;
  // El hoyo tal y como está ahora: con la línea movida y, si el green no se
  // movió, el suyo (con su contorno); si no, delante y fondo a 10 m
  const greenMarcado = edicion.green;
  const hoyoAhora = useMemo(() => {
    if (!linea) return greenMarcado ? { playLine: [], green: { center: greenMarcado } } : hoyo;
    if (hoyo?.green && mismoPunto(hoyo.green.center, linea.at(-1))) return { ...hoyo, playLine: linea };
    return hoyoDeUnaMarca({ tee: linea[0], bends: linea.slice(1, -1), greenCenter: linea.at(-1) });
  }, [hoyo, linea, greenMarcado]);
  const lineaQueSePinta = lineaOculta && !reporte ? null : linea;
  const datosDeLaLinea = useMemo(() => geojsonDeLaLinea(lineaQueSePinta ?? []), [lineaQueSePinta]);
  const ultimaLinea = useRef(datosDeLaLinea);
  const ultimaMedida = useRef(geojsonDeLaMedida([]));
  const etiquetasDeLaMedida = useRef([]);
  const etiquetasDeLaLinea = useRef([]);
  const hoyoActual = useRef(edicion.linea ? { playLine: [], green: hoyo?.green ?? null } : hoyo);
  const puntosDeLaLinea = useRef([]);
  const marcaDeLaSalida = useRef(null);
  // Al cerrar, lo último: se envía al desmontar, se cierre como se cierre
  // (botón, Escape o «atrás»)
  const alCerrar = useRef({ edicion, recoge, onMuestra, campo: referenciaDelCampo });
  // Lo ya enviado de esta apertura: la versión. Toda la apertura es una sola
  // muestra con un solo id: si la app se oculta, sale ya; si luego se toca, al
  // cerrar sale otra vez con el mismo id (en el móvil sustituye a la de la cola;
  // en el servidor, si ya llegó, cuenta una)
  const enviada = useRef({ version: null, id: null });
  const yaEmpezo = useRef(false);
  const empezar = useCallback(() => {
    if (yaEmpezo.current) return;
    yaEmpezo.current = true;
    onEmpezar?.();
  }, [onEmpezar]);

  // El toque: mientras se marca, marca; si no, mide. Por ref, porque el mapa
  // se monta una vez y su oyente vería el estado de entonces
  const alTocar = useRef(null);
  const hacerLineaAhora = useRef(null);
  const hacerLinea = (desde, hasta) => hacerLineaAhora.current?.(desde, hasta) ?? false;
  // Se aleja (sin girar) la mitad que los metros de la tarjeta, para buscar el
  // green (16 oct: antes, a los metros enteros, con un anillo)
  const alejarAhora = useRef(null);
  const alejarDesde = (salida) => alejarAhora.current?.(salida);
  // El doble toque son dos `click` seguidos: el segundo no puede ser el green
  const ultimoToque = useRef(0);
  // La salida del último toque, por si un doble toque corta su alejamiento
  const salidaRecienTocada = useRef(null);
  const enlaceEntero = useRef(null);
  useLayoutEffect(() => {
    ultimaLinea.current = datosDeLaLinea;
    // A mitad de un reporte, lo que se enviaría al cerrar es lo de antes de él
    alCerrar.current = { edicion: reporte ? antesDelReporte.current : edicion, recoge, onMuestra, campo: referenciaDelCampo };
    // De la salida al green, con los codos de su par puestos sobre la recta
    hacerLineaAhora.current = (desde, hasta) => {
      if (salidaGreenFueraDeLimites(desde, hasta)) {
        setAvisoDeMarca(t('mapa.fueraDeLimites'));
        return false;
      }
      const nueva = conCodosDelPar([desde, hasta], par);
      setEdicion((e) => ({ linea: nueva, green: null, cambiada: true, version: e.version + 1 }));
      setConAyudaDeCodos(nueva.length > 2);
      setMarca({ fase: null, tee: null });
      return true;
    };
    alejarAhora.current = (salida) => {
      if (!metros) return;
      mapaRef.current?.fitBounds(limitesDelHoyo({ playLine: circuloAlrededor(salida, metros / 2) }), {
        bearing: mapaRef.current.getBearing(),
        padding: margen(),
      });
    };
    alTocar.current = (p) => {
      // Reportando, el mapa no mide: marca la salida y el green que se proponen
      if (reporte) {
        // El segundo toque de un doble toque no es el green (/code-review)
        const ahora = globalThis.performance.now();
        const dobleToque = ahora - ultimoToque.current < DOBLE_TOQUE_MS;
        ultimoToque.current = ahora;
        if (dobleToque) return;
        if (reporte.fase === 'salida') {
          setReporte({ ...reporte, fase: 'green', tee: p });
        } else if (reporte.fase === 'green') {
          if (salidaGreenFueraDeLimites(reporte.tee, p)) {
            setAvisoDeMarca(t('mapa.fueraDeLimites'));
            return;
          }
          setAvisoDeMarca(null);
          setEdicion((e) => ({ ...e, linea: conCodosDelPar([reporte.tee, p], par), green: null, version: e.version + 1 }));
          setReporte({ fase: 'lista', motivo: reporte.motivo });
        }
        return;
      }
      // Mientras se pregunta si estás en la salida, el mapa no marca ni mide
      if (fase === 'pregunta') return;
      if (pidiendo) {
        const ahora = globalThis.performance.now();
        if (ahora - ultimoToque.current < DOBLE_TOQUE_MS) {
          // El segundo toque no marca, pero corta el alejamiento: se rehace (QA)
          if (salidaRecienTocada.current) alejarDesde(salidaRecienTocada.current);
          return;
        }
        ultimoToque.current = ahora;
        salidaRecienTocada.current = null;
        setAvisoDeMarca(null);
        empezar();
        // No estás en la salida: el green que tocas, solo (17 oct)
        if (marca.soloGreen) {
          // A más de lo que mide un hoyo de donde estás, no es el green de este
          // hoyo: será de cada jugador que venga después (revisión, 17 oct)
          if (posicionEnElCampo && salidaGreenFueraDeLimites(posicionEnElCampo, p) === 'lejos') {
            setAvisoDeMarca(t('mapa.fueraDeLimites'));
            return;
          }
          setEdicion((e) => ({ linea: null, green: p, cambiada: true, version: e.version + 1 }));
          setMarca({ fase: null, tee: null });
          // Con el green puesto, de ti a él (D6)
          setDesdeMi(true);
          setCodoPendiente(true);
          return;
        }
        if (marcandoSalida && !marca.tee) {
          // Con el green ya puesto, la salida basta
          if (greenConocido) {
            hacerLinea(p, greenConocido);
            return;
          }
          setMarca((m) => ({ ...m, fase: 'pidiendo', tee: p }));
          salidaRecienTocada.current = p;
          alejarDesde(p);
          return;
        }
        // Sobre la línea aprobada, su final (donde acaba el hoyo) es el green
        const aprobada = hoyo?.playLine ?? [];
        const desde = marcandoSalida ? [marca.tee] : aprobada.slice(0, Math.max(1, aprobada.length - 1));
        if (desde.length === 0 || salidaGreenFueraDeLimites(desde[0], p)) {
          setAvisoDeMarca(t('mapa.fueraDeLimites'));
          return;
        }
        // Con los codos de su par ya puestos, para llevarlos a la calle; una
        // línea de OSM con muchos puntos se queda con los de su par (QA, 16 oct)
        const reducida = aCodosDelPar([...desde, p], par);
        const nueva = conCodosDelPar(reducida, par);
        setEdicion((e) => ({ linea: nueva, green: null, cambiada: true, version: e.version + 1 }));
        // La ayuda, solo si se pusieron codos (no si la línea ya traía los suyos)
        setConAyudaDeCodos(nueva.length > reducida.length);
        setMarca({ fase: null, tee: null });
        return;
      }
      setGracias(false);
      setTocado(p);
      // El mapa gira hacia el punto y os encuadra, contigo abajo (Agustín, 16
      // oct); lejos del campo no, que alejaría a kilómetros
      if (posicionEnElCampo) {
        mapaRef.current?.fitBounds(limitesDelHoyo({ playLine: [posicionEnElCampo, p] }), {
          bearing: rumbo(posicionEnElCampo, p),
          padding: margen(),
          maxZoom: 18,
        });
      }
    };
  });

  // Al cerrar: si la hizo o la movió, y el hoyo aún recoge, la línea va como
  // muestra; si no es válida (green imposible, más codos de los que se guardan),
  // no. Nada de esto se le dice al jugador
  useEffect(() => {
    const enviarSiHace = () => {
      const { edicion: { linea: ultima, green: soloGreen, cambiada, version }, recoge: recogiendo, onMuestra: enviar, campo } = alCerrar.current;
      if (!cambiada || !recogiendo || !enviar) return;
      // Una línea que vale, o (17 oct) un green solo que no esté lejos del campo
      const muestra = ultima
        ? muestraValida(ultima, campo) && { tee: ultima[0], bends: ultima.slice(1, -1), greenCenter: ultima.at(-1) }
        : soloGreen && !estaLejosDelCampo(soloGreen, campo) && { tee: null, bends: [], greenCenter: soloGreen };
      if (!muestra) return;
      if (enviada.current.version === version) return;
      enviada.current = { version, id: enviada.current.id ?? globalThis.crypto.randomUUID() };
      enviar({ id: enviada.current.id, ...muestra });
    };
    // Si se cierra la app (o el móvil la mata) con el mapa abierto, lo hecho no
    // se pierde: sale al ocultarse (Agustín, 16 oct)
    const alOcultarse = () => {
      if (globalThis.document.visibilityState === 'hidden') enviarSiHace();
    };
    globalThis.document.addEventListener('visibilitychange', alOcultarse);
    return () => {
      globalThis.document.removeEventListener('visibilitychange', alOcultarse);
      enviarSiHace();
    };
  }, []);

  // El hoyo entero, girado como se juega y lo más grande que quepa: el centro y
  // el zoom se calculan con el hoyo girado (`fitBounds` encuadra su caja
  // norte-sur, que girada ocupa mucho más, y el hoyo salía pequeño; 16 oct)
  const encuadrarHoyo = useCallback(
    (animar) => {
      const { hoyo: h } = inicio.current;
      const orientacion = orientacionDelHoyo(h);
      const mapa = mapaRef.current;
      // Sin rumbo no hay hoyo orientado que encuadrar (el mapa va con el norte arriba)
      if (!mapa || orientacion === null) return;
      const padding = margen();
      const encuadre = encuadreGirado(h, orientacion, {
        ancho: contenedor.current?.clientWidth || 360,
        alto: contenedor.current?.clientHeight || 640,
        padding,
      });
      if (!encuadre) return;
      // Sin `padding`: MapLibre lo guardaría y lo sumaría a todo lo de después
      // (medir, «Céntrame»); el centro ya viene desplazado al medio del hueco
      const camara = { center: lngLat(encuadre.center), zoom: encuadre.zoom, bearing: orientacion };
      if (animar) mapa.easeTo(camara);
      else mapa.jumpTo(camara);
    },
    [margen],
  );

  // El mapa se crea en la ref del contenedor, que corre antes que los efectos de
  // abajo (que ya lo encuentran hecho) y devuelve su limpieza (React 19)
  const montarMapa = useCallback((nodo) => {
    if (!nodo) return undefined;
    contenedor.current = nodo;
    const { hoyo: h, conMapa: orientado, centroSinMapa: delCampo } = inicio.current;
    // Sin la ubicación del campo, la salida del hoyo si la tiene (no España entera)
    const centro = delCampo ?? h?.playLine?.[0] ?? h?.green?.center ?? null;
    let mapa;
    try {
      mapa = new MapaDeMapLibre({
        container: nodo,
        style: ESTILO,
        attributionControl: false,
        bearing: orientado ? orientacionDelHoyo(h) : 0,
        // Un hoyo con mapa se ve como se juega: sin giro ni inclinación
        dragRotate: !orientado,
        pitchWithRotate: false,
        touchPitch: false,
        ...(centro ? { center: lngLat(centro), zoom: ZOOM_SIN_MAPA } : ESPAÑA),
      });
    } catch (error) {
      captureError(error, { tags: { modulo: 'mapa-de-hoyos' } });
      setSinMapa(true);
      return undefined;
    }
    mapaRef.current = mapa;
    if (orientado) {
      mapa.touchZoomRotate.disableRotation();
      mapa.keyboard.disableRotation();
      // Uno ya aquí, por si acaso; el bueno, en cuanto la ventana está pintada
      encuadrarHoyo(false);
    }
    mapa.on('load', () => {
      // El hoyo de ahora, no el de al abrir: pudo cambiar antes de que cargara
      mapa.addSource('hoyo', { type: 'geojson', data: geojsonDelHoyo(hoyoActual.current) });
      mapa.addLayer({
        id: 'linea-de-juego',
        type: 'line',
        source: 'hoyo',
        filter: ['==', ['get', 'tipo'], 'linea'],
        paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [2, 2] },
      });
      mapa.addSource('medida', { type: 'geojson', data: ultimaMedida.current });
      mapa.addLayer({
        id: 'medida-linea',
        type: 'line',
        source: 'medida',
        paint: { 'line-color': '#facc15', 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
      });
      mapa.addSource('marcado', { type: 'geojson', data: ultimaLinea.current });
      mapa.addLayer({
        id: 'marcado-linea',
        type: 'line',
        source: 'marcado',
        filter: ['==', ['get', 'tipo'], 'linea'],
        paint: { 'line-color': '#ffffff', 'line-width': 3 },
      });
      mapa.addLayer({
        id: 'green',
        type: 'circle',
        source: 'hoyo',
        filter: ['==', ['get', 'tipo'], 'green'],
        paint: { 'circle-radius': 6, 'circle-color': '#facc15', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 },
      });
    });
    // Con `originalEvent`, lo movió el jugador (no un `jumpTo` nuestro)
    mapa.on('movestart', (e) => {
      if (e.originalEvent) movidoPorElJugador.current = true;
    });
    // Un toque sin arrastrar mide; arrastrar y pellizcar mueven el mapa
    mapa.on('click', (e) => alTocar.current({ lat: e.lngLat.lat, lon: e.lngLat.lng }));
    return () => {
      // Sus marcadores se van con él: el mapa nuevo (React lo monta dos veces
      // en desarrollo) pone los suyos, no mueve los de este
      for (const m of [...etiquetasDeLaLinea.current, ...etiquetasDeLaMedida.current, ...puntosDeLaLinea.current, marcaDeLaSalida.current, marcaGps.current, marcaTocada.current]) m?.remove();
      etiquetasDeLaLinea.current = [];
      etiquetasDeLaMedida.current = [];
      puntosDeLaLinea.current = [];
      marcaDeLaSalida.current = null;
      marcaGps.current = null;
      marcaTocada.current = null;
      mapa.remove();
      mapaRef.current = null;
    };
  }, [encuadrarHoyo]);

  // En cuanto la ventana está pintada (la cabecera y el panel de abajo ya se
  // pueden medir), y antes de que el jugador pueda tocar nada, el hoyo se
  // encuadra lo más grande que quepa. No se espera a `load`: con mala cobertura
  // tarda, y al llegar le quitaría lo que estuviera mirando (revisión, 16 oct)
  useLayoutEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    mapa.resize?.();
    const { hoyo: h, conMapa: orientado, soloGreen, metros: deLaTarjeta } = inicio.current;
    if (orientado) encuadrarHoyo(false);
    else if (soloGreen && deLaTarjeta && h?.playLine?.[0]) {
      mapa.fitBounds(limitesDelHoyo({ playLine: circuloAlrededor(h.playLine[0], deLaTarjeta / 2) }), {
        bearing: 0,
        padding: margen(),
        animate: false,
      });
    }
  }, [encuadrarHoyo, margen]);
  // El panel de abajo crece después (el recuadro, los avisos del GPS): si el
  // jugador aún no ha tocado ni movido nada, el hoyo se vuelve a encuadrar para
  // que no quede debajo (/code-review, 16 oct)
  useEffect(() => {
    const panel = abajo.current;
    const Observador = globalThis.ResizeObserver;
    if (!panel || !Observador || !inicio.current.conMapa) return undefined;
    const observador = new Observador(() => {
      if (movidoPorElJugador.current || yaEmpezo.current || tocadoAhora.current) return;
      encuadrarHoyo(false);
    });
    observador.observe(panel);
    return () => observador.disconnect();
  }, [encuadrarHoyo]);

  // Mi posición: el punto azul, y la primera vez sin mapa, el mapa va a ella
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    if (!posicion) {
      // Sin señal buena, el punto azul no se queda donde ya no estás
      marcaGps.current?.remove();
      marcaGps.current = null;
      return;
    }
    marcaGps.current ??= new Marker({ element: punto('h-4 w-4 rounded-full border-[3px] border-white bg-blue-500 shadow-[0_0_0_6px_rgba(59,130,246,0.3)]') }).setLngLat(lngLat(posicion)).addTo(mapa);
    marcaGps.current.setLngLat(lngLat(posicion));
    // Lejos no; y si mientras tanto el jugador movió el mapa, tampoco al llegar
    if (!inicio.current.conMapa && !centradoEnGps.current && !lejos && !movidoPorElJugador.current) {
      centradoEnGps.current = true;
      mapa.jumpTo({ center: lngLat(posicion), zoom: ZOOM_SIN_MAPA });
    }
  }, [posicion, lejos]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    // Midiendo desde ti, el punto es el codo y se arrastra (D3): si cambia eso,
    // se rehace
    if (!tocado || (marcaTocada.current && marcaTocada.current.arrastrable !== desdeMi)) {
      marcaTocada.current?.remove();
      marcaTocada.current = null;
    }
    if (!tocado) return;
    if (!marcaTocada.current) {
      const m = new Marker({ element: punto('h-3.5 w-3.5 rounded-full border-2 border-white bg-yellow-400 shadow'), draggable: desdeMi });
      m.arrastrable = desdeMi;
      if (desdeMi) {
        m.on('dragend', (e) => {
          const { lng, lat } = e.target.getLngLat();
          setTocado({ lat, lon: lng });
        });
        m.getElement().addEventListener('click', (e) => e.stopPropagation());
      }
      marcaTocada.current = m.setLngLat(lngLat(tocado)).addTo(mapa);
    }
    marcaTocada.current.setLngLat(lngLat(tocado));
  }, [tocado, desdeMi]);

  // Las líneas de la medida y sus metros. Las etiquetas se mueven, no se
  // rehacen, con cada lectura del GPS
  const green = hoyoAhora?.green ?? null;
  // A mitad de un hoyo con línea y green: la línea desde ti, sin preguntar (H1, H2)
  const salidaDeMiBarra = lineaInicial?.[0] ?? null;
  if (!mitadDecidida && green && (hoyo?.playLine?.length ?? 0) >= 2 && salidaDeMiBarra && posicionBuena) {
    setMitadDecidida(true);
    if (distanciaEnMetros(posicionBuena, salidaDeMiBarra) > FUERA_DE_LA_SALIDA_M) {
      setLineaOculta(true);
      setDesdeMi(true);
      setCodoPendiente(true);
    }
  }
  // El codo, una vez: con el primer GPS bueno, en medio si pasa de 200 m. Luego
  // no se mueve, ni vuelve si se quita (D2, D4, D10). Durante el render, como
  // se ajusta un estado a otro en React
  if (codoPendiente && desdeMi && posicionBuena && green) {
    setCodoPendiente(false);
    if (distanciaEnMetros(posicionBuena, green.center) > CODO_DESDE_M) setTocado(enMedio(posicionBuena, green.center));
  }
  const textoDeTramo = useCallback((metros) => t('mapa.tramo', { metros }), [t]);
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const tramos = desdeMi && !reporte ? tramosDesdeMi(posicionBuena, tocado, green) : tramosDeLaMedida(posicionEnElCampo, tocado, green);
    ultimaMedida.current = geojsonDeLaMedida(tramos);
    mapa.getSource('medida')?.setData(ultimaMedida.current);
    sincronizarCifras(mapa, etiquetasDeLaMedida.current, tramos, { tipo: 'medida', color: 'text-yellow-300', texto: textoDeTramo });
  }, [desdeMi, reporte, posicionBuena, posicionEnElCampo, tocado, green, textoDeTramo]);


  // Los metros de cada tramo de la línea que se ve (Agustín, 16 oct: siempre que
  // se pinta una línea). No dependen del GPS: valen lejos del campo y sin señal
  // Reportando, la de siempre no se ve: solo la que se propone
  const lineaVisible = useMemo(
    () => lineaQueSePinta ?? (reporte || lineaOculta ? [] : (hoyo?.playLine ?? [])),
    [lineaQueSePinta, hoyo, reporte, lineaOculta],
  );
  // Como las de medir, se mueven y se reescriben, no se rehacen; también
  // mientras se arrastra, antes de soltar
  const ponerCifrasDeLaLinea = useCallback(
    (puntos) => {
      const mapa = mapaRef.current;
      if (!mapa) return;
      sincronizarCifras(mapa, etiquetasDeLaLinea.current, tramosDeLaLinea(puntos), { tipo: 'linea', color: 'text-white', texto: textoDeTramo });
    },
    [textoDeTramo],
  );
  useEffect(() => ponerCifrasDeLaLinea(lineaVisible), [lineaVisible, ponerCifrasDeLaLinea]);
  // Para el arrastre, las de ahora: los puntos no se rehacen si solo cambian ellas
  const cifrasAlArrastrar = useRef(ponerCifrasDeLaLinea);
  const empezarAlArrastrar = useRef(empezar);
  useLayoutEffect(() => {
    cifrasAlArrastrar.current = ponerCifrasDeLaLinea;
    empezarAlArrastrar.current = empezar;
  }, [ponerCifrasDeLaLinea, empezar]);
  // La línea discontinua del hoyo, del mismo hoyo que sus cifras; con la línea
  // que se mueve, solo su green (la línea va aparte, entera)
  const hoyoQueSeDibuja = useMemo(() => {
    if (linea) return { playLine: [], green: hoyoAhora?.green ?? null };
    if (reporte) return { playLine: [], green: null };
    return greenMarcado ? hoyoAhora : hoyo;
  }, [linea, hoyo, hoyoAhora, greenMarcado, reporte]);
  useEffect(() => {
    hoyoActual.current = hoyoQueSeDibuja;
    mapaRef.current?.getSource('hoyo')?.setData(geojsonDelHoyo(hoyoQueSeDibuja));
  }, [hoyoQueSeDibuja]);

  // La ubicación del campo llega después de abrir: centra el mapa si aún no lo
  // hizo el GPS ni el jugador lo ha movido. Si el GPS lo llevó antes a otro
  // sitio y resulta que estás lejos del campo, vuelve al campo, y al llegar a
  // él el mapa irá a ti, igual que si la ubicación hubiera llegado primero. Es
  // una vez: con el mapa ya en ti (cerca), no salta solo después
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !centroSinMapa || inicio.current.conMapa || inicio.current.centroSinMapa) return;
    inicio.current.centroSinMapa = centroSinMapa;
    if ((centradoEnGps.current && !lejos) || movidoPorElJugador.current) return;
    centradoEnGps.current = false;
    mapa.jumpTo({ center: lngLat(centroSinMapa), zoom: ZOOM_SIN_MAPA });
  }, [centroSinMapa, lejos]);


  const responder = (enLaSalida) => {
    setAvisoDeMarca(null);
    // Contestar ya es empezar: lo que se ve no se rehace mientras se marca
    empezar();
    if (!enLaSalida) {
      // A mitad de hoyo, la distancia de ti al green ya (D1, D2); sin green,
      // primero se toca (D6)
      setContestadoNo((n) => n + 1);
      if (greenConocido) {
        setMarca({ fase: null, tee: null });
        setDesdeMi(true);
        setCodoPendiente(true);
      } else {
        setMarca({ fase: 'pidiendo', tee: null, soloGreen: true });
      }
      return;
    }
    const aqui = posicionBuena;
    if (!aqui) {
      // No te localizamos bien: la salida se toca (M4)
      setMarca({ fase: 'pidiendo', tee: null, malGps: true });
      return;
    }
    if (greenConocido) {
      // Si tu posición y ese green no hacen un hoyo, se avisa y se toca la salida
      if (!hacerLinea(aqui, greenConocido)) setMarca({ fase: 'pidiendo', tee: null });
      return;
    }
    setMarca({ fase: 'pidiendo', tee: aqui });
    alejarDesde(aqui);
  };

  // El hoyo entero: se toca la salida y el green, como lejos del campo; con el
  // green ya puesto, la salida basta (D8). La medida desde ti se va
  const marcarEntero = () => {
    setDesdeMi(false);
    setTocado(null);
    setMarca({ fase: 'pidiendo', tee: null });
  };

  // El «No» se va de la pantalla y con él el foco: pasa al enlace, para que el
  // lector de pantalla diga lo que hay (revisor, 18 oct). Al contestar, una
  // vez: no cada vez que el GPS va y viene (/code-review)
  useEffect(() => {
    if (contestadoNo) enlaceEntero.current?.focus();
  }, [contestadoNo]);

  // Mientras se pide, el doble toque no acerca: marcaría la salida y el green en el mismo sitio
  // (y al proponer la línea de un reporte, igual)
  const marcandoElReporte = reporte?.fase === 'salida' || reporte?.fase === 'green';
  useEffect(() => {
    const zoom = mapaRef.current?.doubleClickZoom;
    if (pidiendo || marcandoElReporte) zoom?.disable();
    else zoom?.enable();
  }, [pidiendo, marcandoElReporte]);
  // El foco: al primer motivo al abrir el menú, y a «⋮» al acabar el reporte
  // (revisor, 18 oct: el botón que se pulsó desaparece)
  const faseDelReporte = reporte?.fase ?? null;
  useEffect(() => {
    if (faseDelReporte === 'motivos') primerMotivo.current?.focus();
    else if (!faseDelReporte && reportaba.current) botonDeReportar.current?.focus();
    reportaba.current = Boolean(faseDelReporte);
  }, [faseDelReporte]);
  // La salida mientras se pide el green: la recién tocada o, pidiendo solo el
  // green, la aprobada (para ver desde dónde se mide)
  const salidaQueSePinta = reporte?.fase === 'green' ? reporte.tee : pidiendo ? (marca.tee ?? (marcandoSalida ? null : (hoyo?.playLine?.[0] ?? null))) : null;
  useEffect(() => {
    const mapa = mapaRef.current;
    marcaDeLaSalida.current?.remove();
    marcaDeLaSalida.current = null;
    if (!mapa || !salidaQueSePinta) return;
    marcaDeLaSalida.current = new Marker({ element: punto(CLASE_DEL_PUNTO.salida) }).setLngLat(lngLat(salidaQueSePinta)).addTo(mapa);
  }, [salidaQueSePinta]);
  // La línea y sus puntos: la salida, los codos y el green se arrastran; con el
  // dedo, la línea y sus cifras lo siguen, y al soltar queda movida
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    mapa.getSource('marcado')?.setData(datosDeLaLinea);
    for (const m of puntosDeLaLinea.current) m.remove();
    puntosDeLaLinea.current = [];
    const aqui = (e) => {
      const { lat, lng } = e.target.getLngLat();
      return { lat, lon: lng };
    };
    // El green que marcó quien no está en la salida, también se corrige
    // arrastrándolo: será el de los que vengan detrás (revisión, 17 oct)
    if (!linea && greenMarcado) {
      try {
        const m = new Marker({ element: punto(CLASE_DEL_PUNTO.green), draggable: true });
        puntosDeLaLinea.current.push(m);
        m.setLngLat(lngLat(greenMarcado)).addTo(mapa);
        m.on('dragend', (e) => {
          const movido = aqui(e);
          setEdicion((ed) => ({ linea: null, green: movido, cambiada: true, version: ed.version + 1 }));
        });
        m.getElement().addEventListener('click', (e) => e.stopPropagation());
      } catch (error) {
        for (const x of puntosDeLaLinea.current) x.remove();
        puntosDeLaLinea.current = [];
        captureError(error, { tags: { modulo: 'mapa-de-hoyos' } });
      }
      return;
    }
    if (!lineaQueSePinta) return;
    const con = (i, p) => lineaQueSePinta.map((q, j) => (j === i ? p : q));
    // La línea ya viene con los codos de su par (como mucho dos): todos se mueven
    // Si la librería cambia y algo de esto falla, el mapa sigue (sin puntos que
    // mover) en vez de caerse entero; el fallo queda apuntado
    try {
      lineaQueSePinta.forEach((p, i) => {
        // Apuntado antes de ponerlo en el mapa: si algo falla después, se quita
        // Con el menú de motivos abierto no se mueve: lo que se moviera se
        // perdería al elegir o cancelar (/code-review)
        const m = new Marker({ element: punto(CLASE_DEL_PUNTO[tipoDelPunto(i, lineaQueSePinta)]), draggable: !menuDeMotivos });
        puntosDeLaLinea.current.push(m);
        m.setLngLat(lngLat(p)).addTo(mapa);
        // Cada `on` aparte: en MapLibre 6 devuelve una suscripción, no el marcador
        m.on('drag', (e) => {
          const provisional = con(i, aqui(e));
          mapa.getSource('marcado')?.setData(geojsonDeLaLinea(provisional));
          cifrasAlArrastrar.current(provisional);
        });
        m.on('dragend', (e) => {
          const movida = con(i, aqui(e));
          setEdicion((ed) => ({ linea: movida, green: null, cambiada: true, version: ed.version + 1 }));
          setConAyudaDeCodos(false);
          empezarAlArrastrar.current();
        });
        // Tocar un punto no es tocar el mapa: no mide encima de él
        m.getElement().addEventListener('click', (e) => e.stopPropagation());
      });
    } catch (error) {
      // Sin puntos sueltos: los que llegaron a ponerse, fuera también
      for (const m of puntosDeLaLinea.current) m.remove();
      puntosDeLaLinea.current = [];
      captureError(error, { tags: { modulo: 'mapa-de-hoyos' } });
    }
  }, [lineaQueSePinta, linea, datosDeLaLinea, greenMarcado, menuDeMotivos]);

  // Lo de antes, desde que se abre el menú: si el mapa se cierra o se oculta
  // con él abierto, se envía eso (revisor, 18 oct)
  const abrirElMenu = () => {
    antesDelReporte.current = edicion;
    setGracias(false);
    setReporte({ fase: 'motivos' });
  };
  const elegirMotivo = (motivo) => {
    // Lo que se ve no se rehace mientras se propone
    empezar();
    setAvisoDeMarca(null);
    setTocado(null);
    setEdicion((e) => ({ ...e, linea: null, green: null, version: e.version + 1 }));
    setReporte({ fase: 'salida', motivo });
  };
  const acabarElReporte = () => {
    const antes = antesDelReporte.current;
    antesDelReporte.current = null;
    setAvisoDeMarca(null);
    setReporte(null);
    // Tal cual, con su versión: si ya salió al ocultarse, no vuelve a salir
    if (antes) setEdicion(antes);
    // Midiendo desde ti, vuelve también el codo (H9)
    if (desdeMi) setCodoPendiente(true);
  };
  const enviarReporte = () => {
    // Arrastrando se puede salir de los límites: se dice, y no se manda algo
    // que el servidor tiraría tras darle las gracias (/code-review)
    if (salidaGreenFueraDeLimites(linea[0], linea.at(-1))) {
      setAvisoDeMarca(t('mapa.fueraDeLimites'));
      return;
    }
    onReporte?.({
      id: globalThis.crypto.randomUUID(),
      reason: reporte.motivo,
      tee: linea[0],
      bends: linea.slice(1, -1),
      greenCenter: linea.at(-1),
    });
    acabarElReporte();
    setGracias(true);
  };
  // «⋮», solo en un hoyo con línea y sin marcar otra cosa (la pregunta de la
  // salida solo sale en un hoyo sin línea)
  const sePuedeReportar = Boolean(onReporte) && !sinMapa && (hoyo?.playLine?.length ?? 0) >= 2 && !reporte && !pidiendo;

  const empezarAMarcar = () => {
    salidaRecienTocada.current = null;
    setAvisoDeMarca(null);
    setTocado(null);
    setDesdeMi(false);
    // Sin salida, otra vez la pregunta: si no, el «No» se perdía y el primer
    // toque se tomaba por la salida (revisión, 17 oct)
    setMarca({ fase: preguntaPrimero ? 'pregunta' : 'pidiendo', tee: null });
  };

  const fraseDeLaLinea = useMemo(() => {
    const lista = tramosDeLaLinea(lineaVisible).map(([p, q]) => distanciaEnMetros(p, q));
    const [a, b, c] = lista;
    const clave = [null, 'mapa.lineaUnTramo', 'mapa.lineaDosTramos', 'mapa.lineaTresTramos'][lista.length] ?? (lista.length ? 'mapa.lineaVariosTramos' : null);
    if (!clave) return null;
    return t(clave, lista.length > 3 ? { lista: lista.join(' · ') } : { a, b, c });
  }, [lineaVisible, t]);
  // Desde ti, si el GPS es bueno y estás en el hoyo (Agustín, 17 oct); si no,
  // con los metros de tu barra (sin ellos, la línea como está ahora)
  const desdeAqui = useMemo(
    () => distanciasDesdeLaPosicion({ posicion: posicionEnElCampo, precision, green: hoyoAhora?.green ?? null }),
    [posicionEnElCampo, precision, hoyoAhora],
  );
  const deLaTarjeta = useMemo(() => distanciasDelHoyo({ metros, hoyo: hoyoAhora }), [metros, hoyoAhora]);
  const distancias = desdeAqui ?? deLaTarjeta;
  // De dónde salen las cifras: tu posición, tu barra (la tarjeta) o la salida (la línea)
  const origenDelRecuadro = t(desdeAqui ? 'mapa.desdeTuPosicion' : metros ? 'mapa.desdeTuBarra' : 'mapa.desdeLaSalida');
  const hastaAhi = tocado && posicionEnElCampo ? distanciaEnMetros(posicionEnElCampo, tocado) : null;
  const deAhiAlGreen = tocado && green ? distanciaEnMetros(tocado, green.center) : null;
  const aviso = { buscando: t('mapa.buscando'), denegado: t('mapa.denegado'), 'no-disponible': t('mapa.noDisponible') }[gps.estado];

  return (
    // `ModalShell`: el foco entra (por «Cerrar», lo primero) y vuelve a «Mapa» al
    // cerrar, no se sale con el tabulador, Escape cierra y debajo no se desplaza
    <ModalShell isOpen onClose={onCerrar} closeOnBackdrop={false} labelledBy="titulo-del-mapa" boxClassName="fixed inset-x-0 inset-y-0 bg-gray-700">
      <div
        ref={arriba}
        data-testid="mapa-arriba"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 pt-[calc(1rem+env(safe-area-inset-top))] pr-[calc(1rem+env(safe-area-inset-right))] pl-[calc(1rem+env(safe-area-inset-left))]"
      >
        <h2 id="titulo-del-mapa" className={`${PLACA} px-3.5 py-2 text-lg font-extrabold`}>{t('mapa.titulo', { numero: numeroDeHoyo, par })}</h2>
        <span className="flex gap-2">
          {sePuedeReportar && (
            <button
              ref={botonDeReportar}
              type="button"
              onClick={abrirElMenu}
              aria-label={t('mapa.reportar')}
              aria-haspopup="true"
              className={`${BOTON} pointer-events-auto px-3`}
            >
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={onCerrar} className={`${BOTON} pointer-events-auto`}>
            <X className="h-4 w-4" aria-hidden="true" />
            {t('mapa.cerrar')}
          </button>
        </span>
      </div>

      <div ref={montarMapa} className="absolute inset-0" />

      <div
        ref={abajo}
        data-testid="mapa-abajo"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pr-[calc(1rem+env(safe-area-inset-right))] pl-[calc(1rem+env(safe-area-inset-left))]"
      >
        {sinMapa && <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{t('mapa.sinMapaEnEsteMovil')}</p>}
        {aviso && <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{aviso}</p>}

        {avisoDeMarca && <p role="alert" className={`${PLACA} self-start px-3.5 py-2 text-sm text-yellow-300`}>{avisoDeMarca}</p>}

        {/* Siempre montado, para que el lector de pantalla diga las gracias */}
        <div aria-live="polite" className="contents">
          {gracias && !reporte && <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{t('mapa.reporteGracias')}</p>}
        </div>

        {sinMapa ? null : reporte?.fase === 'motivos' ? (
          <div role="group" aria-labelledby="titulo-del-reporte" className={`${PLACA} pointer-events-auto flex flex-col gap-2 p-3`}>
            <span id="titulo-del-reporte" className="text-base font-semibold">{t('mapa.reporteTitulo')}</span>
            {MOTIVOS_DEL_REPORTE.map((clave, i) => (
              <button key={clave} ref={i === 0 ? primerMotivo : undefined} type="button" onClick={() => elegirMotivo(clave)} className="min-h-11 rounded-xl bg-white/15 px-3 py-2 text-left text-[15px] font-semibold text-white">
                {t(`mapa.motivos.${clave}`)}
              </button>
            ))}
            <button type="button" onClick={acabarElReporte} className="min-h-11 px-2 text-sm font-semibold text-yellow-300 underline">
              {t('mapa.cancelar')}
            </button>
          </div>
        ) : reporte ? (
          // Con la propuesta lista, el texto arriba y los botones debajo: a 360 px
          // no caben al lado sin que el texto ocupe medio mapa (revisor, 18 oct)
          <div
            data-testid="barra-del-reporte"
            className={`${PLACA} pointer-events-auto flex gap-2 px-3.5 py-2 ${reporte.fase === 'lista' ? 'flex-col' : 'items-center justify-between'}`}
          >
            <span aria-live="polite" className="text-base font-semibold">
              {t(
                reporte.fase === 'salida'
                  ? 'mapa.reporteSalida'
                  : reporte.fase === 'green'
                    ? 'mapa.reporteGreen'
                    : (linea?.length ?? 0) > 2
                      ? 'mapa.ayudaCodo'
                      : 'mapa.reporteSinCodos',
              )}
            </span>
            <span className={`flex shrink-0 gap-2 ${reporte.fase === 'lista' ? 'justify-end' : ''}`}>
              {reporte.fase === 'lista' && (
                <button type="button" onClick={enviarReporte} className="min-h-11 rounded-xl bg-white px-3 text-[15px] font-semibold text-gray-900">
                  {t('mapa.enviarReporte')}
                </button>
              )}
              <button type="button" onClick={acabarElReporte} className="min-h-11 px-2 text-sm font-semibold text-yellow-300 underline">
                {t('mapa.cancelar')}
              </button>
            </span>
          </div>
        ) : fase === 'pregunta' ? (
          <div className={`${PLACA} pointer-events-auto flex items-center justify-between gap-2 px-3.5 py-2`}>
            <span aria-live="polite" className="text-base font-semibold">{t('mapa.preguntaSalida')}</span>
            <span className="flex gap-2">
              <button type="button" onClick={() => responder(true)} className="min-h-11 rounded-xl bg-white px-4 text-[15px] font-semibold text-gray-900">
                {t('mapa.si')}
              </button>
              <button type="button" onClick={() => responder(false)} className="min-h-11 rounded-xl bg-white/15 px-4 text-[15px] font-semibold text-white">
                {t('mapa.no')}
              </button>
            </span>
          </div>
        ) : pidiendo ? (
          <div className={`${PLACA} pointer-events-auto flex items-center justify-between gap-2 px-3.5 py-2`}>
            <span aria-live="polite" className="text-base font-semibold">
              {t(marca.soloGreen ? 'mapa.pideGreen' : marcandoSalida && !marca.tee ? (marca.malGps ? 'mapa.malGps' : 'mapa.pideSalida') : 'mapa.pideGreen')}
            </span>
            <button type="button" onClick={() => {
                salidaRecienTocada.current = null;
                setMarca({ fase: 'pausado', tee: null });
              }} className="min-h-11 px-2 text-sm font-semibold text-yellow-300 underline">
              {t('mapa.ahoraNo')}
            </button>
          </div>
        ) : tocado ? (
          <div className="flex items-center">
            {/* Los metros van en el mapa, junto a cada línea; aquí, para quien no lo ve */}
            <span role="status" className="sr-only">
              {hastaAhi !== null && <span>{t('mapa.hastaAhi', { metros: hastaAhi })}</span>}
              {deAhiAlGreen !== null && <span>{t('mapa.deAhiAlGreen', { metros: deAhiAlGreen })}</span>}
            </span>
            <button type="button" onClick={() => setTocado(null)} className={`${PLACA} pointer-events-auto min-h-11 px-4 text-sm font-semibold text-yellow-300`}>
              {t('mapa.quitarPunto')}
            </button>
          </div>
        ) : desdeMi && !posicionBuena ? (
          // Sin un GPS bueno no hay línea desde ti: sale en cuanto lo sea (D5)
          <p aria-live="polite" className={`${PLACA} self-start px-3.5 py-2 text-sm`}>
            {t('mapa.buscando')}
          </p>
        ) : conAyudaDeCodos ? (
          <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{t('mapa.ayudaCodo')}</p>
        ) : (
          <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{t('mapa.ayudaMedir')}</p>
        )}

        {/* Tras el «No», por si quiere marcarlo igualmente (D1, D6, D8) */}
        {((desdeMi && preguntaPrimero) || (pidiendo && marca.soloGreen)) && !reporte && (
          <button ref={enlaceEntero} type="button" onClick={marcarEntero} className="pointer-events-auto min-h-11 self-end px-2 text-sm font-semibold text-white underline [text-shadow:0_1px_2px_#000]">
            {t('mapa.marcarEntero')}
          </button>
        )}

        {marca.fase === 'pausado' && !sinMapa && !reporte && (
          <button type="button" onClick={empezarAMarcar} className={`${BOTON} pointer-events-auto self-end`}>
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {t('mapa.marcarHoyo')}
          </button>
        )}

        {/* Las cifras de la línea, en una frase, para quien no ve el mapa */}
        {fraseDeLaLinea && (
          <span data-testid="tramos-de-la-linea" className="sr-only">
            {fraseDeLaLinea}
          </span>
        )}
        {distancias && (
          // Se lee en la frase del recuadro, con las cifras (CodeRabbit, 17 oct)
          <p aria-hidden="true" className="self-start text-[11px] font-semibold text-white/90 [text-shadow:0_1px_2px_#000]">
            {origenDelRecuadro}
          </p>
        )}
        {distancias && (
          <div className="grid grid-cols-[1fr_1.35fr_1fr] overflow-hidden rounded-2xl bg-white/95 text-gray-900 shadow-xl">
            <span className="sr-only">{t('mapa.etiqueta', { ...distancias, origen: origenDelRecuadro })}</span>
            {[
              ['delante', distancias.front, ''],
              ['centro', distancias.center, 'bg-green-700 text-white'],
              ['fondo', distancias.back, ''],
            ].map(([lado, metros, destacado]) => (
              <div key={lado} aria-hidden="true" className={`flex flex-col items-center py-2 ${destacado}`}>
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">{t(`mapa.${lado}`)}</span>
                <span data-testid={`distancia-${lado}`} className={`font-mono font-extrabold tabular-nums leading-none ${lado === 'centro' ? 'text-4xl' : 'text-2xl'}`}>
                  {metros}
                </span>
                <span className="text-[11px] opacity-70">{t('mapa.metros')}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="pointer-events-auto flex-1 text-[10px] text-white/80 [text-shadow:0_1px_2px_#000]">
            <span>{t('mapa.atribucionPnoa')}</span>
            {atribucion && (
              <>
                {' · '}
                <a href={LICENCIA_OSM} target="_blank" rel="noopener noreferrer" title={atribucion} className="underline">
                  {t('mapa.atribucionOsm')}
                </a>
              </>
            )}
          </span>
          {sinMapa ? null : conMapa ? (
            <button
              type="button"
              onClick={() => {
                // A mitad de hoyo, vuelve también su línea (H3)
                setLineaOculta(false);
                encuadrarHoyo(true);
              }}
              className={`${BOTON} pointer-events-auto`}
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
              {t('mapa.verHoyo')}
            </button>
          ) : (
            <button type="button" onClick={() => mapaRef.current?.resetNorth()} className={`${BOTON} pointer-events-auto`}>
              <Compass className="h-4 w-4" aria-hidden="true" />
              {t('mapa.norte')}
            </button>
          )}
          {!sinMapa && (
            <button
              type="button"
              disabled={!posicionEnElCampo}
              onClick={() => mapaRef.current?.easeTo({ center: lngLat(posicion) })}
              className={`${BOTON} pointer-events-auto`}
            >
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
              {t('mapa.centrame')}
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

export default MapaDelHoyo;
