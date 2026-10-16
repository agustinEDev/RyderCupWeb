import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, LocateFixed, Maximize2, MapPin, X } from 'lucide-react';
import { Map as MapaDeMapLibre, Marker, setWorkerUrl } from 'maplibre-gl';
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import './mapa.css';
import { distanciaEnMetros } from '../../../domain/services/distanciasAlGreen';
import { distanciasDelHoyo } from '../../../domain/services/distanciasDelHoyo';
import { limitesDelHoyo, orientacionDelHoyo, rumbo } from '../../../domain/services/geometriaDelHoyo';
import {
  MAX_CODOS,
  aCodosDelPar,
  circuloAlrededor,
  conCodosDelPar,
  estaLejosDelCampo,
  hoyoDeUnaMarca,
  salidaGreenFueraDeLimites,
} from '../../../domain/services/hoyoMarcado';
import { usePosicionGps } from '../../../hooks/usePosicionGps';
import { useCentroSinMapa } from '../../../hooks/useCentroSinMapa';
import { captureError } from '../../../utils/sentryHelpers';
import ModalShell from '../../ui/ModalShell';

// Empaquetado, MapLibre no encuentra solo su worker: va como fichero aparte
setWorkerUrl(urlDelWorker);

// Ortofoto del PNOA (IGN), la de más detalle de España; sus teselas permiten CORS
export const TESELAS_PNOA =
  'https://www.ign.es/wmts/pnoa-ma?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=OI.OrthoimageCoverage' +
  '&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';
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
// La línea de un hoyo con salida y green, con los codos de su par para moverlos.
// Acaba en el centro del green: la de OSM acaba donde termina el hoyo, cerca
// pero no en él, y así se mide como la medida oficial (al centro del green)
const lineaParaMover = (hoyo, par) =>
  hoyo?.green && (hoyo.playLine?.length ?? 0) > 1 ? conCodosDelPar([...hoyo.playLine.slice(0, -1), hoyo.green.center], par) : null;
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

/**
 * El mapa del hoyo a pantalla completa (BE #532), sobre la ortofoto del PNOA.
 *
 * Con mapa del hoyo: la salida abajo y el green arriba, sin giro. El recuadro
 * de delante, centro y fondo es fijo, con los metros oficiales desde la
 * salida (16 oct). Sin mapa: norte arriba, giro libre. Siempre se mide tocando.
 * El GPS va mientras el mapa está abierto, ni antes ni después.
 *
 * La línea del hoyo (la salida, sus codos y el green) se puede mover siempre,
 * para medir; en un hoyo sin línea se marca tocando la salida y el green, y los
 * codos salen ya según el par. Al cerrar, si el jugador la hizo o la movió y el
 * hoyo aún recoge muestras (`recoge`), se envía con `onMuestra`, sin decírselo:
 * todo esto es transparente para él (Agustín, 16 oct).
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
}) => {
  const { t } = useTranslation('scoring');
  const conMapa = orientacionDelHoyo(hoyo) !== null;
  const gps = usePosicionGps({ activo: true });
  const posicion = gps.estado === 'listo' ? gps.posicion : null;
  const centroSinMapa = useCentroSinMapa({ golfCourseId, activo: !conMapa });
  // Si estás en el campo: si el hoyo tiene salida (aunque no tenga green), se
  // mide desde ella; si no, desde la ubicación del campo (sin ninguna de las
  // dos, se da por hecho que sí)
  const referenciaDelCampo = hoyo?.playLine?.[0] ?? centroSinMapa;
  // Lejos (no estás jugando): el mapa no se va a tu casa, no se mide desde ti
  // y «Céntrame» no se puede pulsar (16 oct)
  const lejos = estaLejosDelCampo(posicion, referenciaDelCampo);
  const posicionEnElCampo = lejos ? null : posicion;
  const [tocado, setTocado] = useState(null);
  // Sin WebGL (móviles viejos, o desactivado) no hay mapa, pero el recuadro de
  // la tarjeta sigue, que no lo necesita
  const [sinMapa, setSinMapa] = useState(false);

  const contenedor = useRef(null);
  const mapaRef = useRef(null);
  const marcaGps = useRef(null);
  const marcaTocada = useRef(null);
  const centradoEnGps = useRef(false);
  const movidoPorElJugador = useRef(false);
  // Lo de la primera vez, sin rehacer el mapa si cambia mientras está abierto
  const inicio = useRef({ hoyo, conMapa, centroSinMapa, soloGreen: porMarcar === 'green', metros });

  // Marcar el hoyo: sin salida, se piden la salida y el centro del green; con
  // salida, el green. «Ahora no» deja medir como siempre
  const [marca, setMarca] = useState({ fase: porMarcar ? 'pidiendo' : null, tee: null });
  const [avisoDeMarca, setAvisoDeMarca] = useState(null);
  const marcandoSalida = porMarcar === 'salida';
  const pidiendo = marca.fase === 'pidiendo';
  // La línea que se ve y se mueve; `cambiada`, si el jugador la hizo o la movió
  const [edicion, setEdicion] = useState(() => ({ linea: lineaParaMover(hoyo, par), cambiada: false, version: 0 }));
  const [conAyudaDeCodos, setConAyudaDeCodos] = useState(false);
  const linea = edicion.linea;
  // El hoyo tal y como está ahora: con la línea movida y, si el green no se
  // movió, el suyo (con su contorno); si no, delante y fondo a 10 m
  const hoyoAhora = useMemo(() => {
    if (!linea) return hoyo;
    if (hoyo?.green && mismoPunto(hoyo.green.center, linea.at(-1))) return { ...hoyo, playLine: linea };
    return hoyoDeUnaMarca({ tee: linea[0], bends: linea.slice(1, -1), greenCenter: linea.at(-1) });
  }, [hoyo, linea]);
  const datosDeLaLinea = useMemo(() => geojsonDeLaLinea(linea ?? []), [linea]);
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
  // El doble toque son dos `click` seguidos: el segundo no puede ser el green
  const ultimoToque = useRef(0);
  // La salida del último toque, por si un doble toque corta su alejamiento
  const salidaRecienTocada = useRef(null);
  useLayoutEffect(() => {
    ultimaLinea.current = datosDeLaLinea;
    alCerrar.current = { edicion, recoge, onMuestra, campo: referenciaDelCampo };
    alTocar.current = (p) => {
      if (pidiendo) {
        // Se aleja (sin girar) la mitad que los metros de la tarjeta, para
        // buscar el green (16 oct: antes, a los metros enteros, con un anillo)
        const alejarDesde = (salidaTocada) => {
          if (!metros) return;
          const alto = contenedor.current?.clientHeight || 640;
          mapaRef.current?.fitBounds(limitesDelHoyo({ playLine: circuloAlrededor(salidaTocada, metros / 2) }), {
            bearing: mapaRef.current.getBearing(),
            padding: margenDelEncuadre(alto),
          });
        };
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
        if (marcandoSalida && !marca.tee) {
          setMarca((m) => ({ ...m, tee: p }));
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
        const nueva = conCodosDelPar(aCodosDelPar([...desde, p], par), par);
        setEdicion((e) => ({ linea: nueva, cambiada: true, version: e.version + 1 }));
        // La ayuda, solo si se pusieron codos (no si la línea ya traía los suyos)
        setConAyudaDeCodos(nueva.length > desde.length + 1);
        setMarca({ fase: null, tee: null });
        return;
      }
      setTocado(p);
      // El mapa gira hacia el punto y os encuadra, contigo abajo (Agustín, 16
      // oct); lejos del campo no, que alejaría a kilómetros
      if (posicionEnElCampo) {
        const alto = contenedor.current?.clientHeight || 640;
        mapaRef.current?.fitBounds(limitesDelHoyo({ playLine: [posicionEnElCampo, p] }), {
          bearing: rumbo(posicionEnElCampo, p),
          padding: margenDelEncuadre(alto),
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
      const { edicion: { linea: ultima, cambiada, version }, recoge: recogiendo, onMuestra: enviar, campo } = alCerrar.current;
      if (!cambiada || !recogiendo || !enviar || !ultima || !muestraValida(ultima, campo)) return;
      if (enviada.current.version === version) return;
      enviada.current = { version, id: enviada.current.id ?? globalThis.crypto.randomUUID() };
      enviar({ id: enviada.current.id, tee: ultima[0], bends: ultima.slice(1, -1), greenCenter: ultima.at(-1) });
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

  const encuadrarHoyo = useCallback((animar) => {
    const { hoyo: h } = inicio.current;
    const limites = limitesDelHoyo(h);
    if (!limites) return;
    const alto = contenedor.current?.clientHeight || 640;
    mapaRef.current?.fitBounds(limites, { bearing: orientacionDelHoyo(h), padding: margenDelEncuadre(alto), animate: animar });
  }, []);

  // El mapa se crea en la ref del contenedor, que corre antes que los efectos de
  // abajo (que ya lo encuentran hecho) y devuelve su limpieza (React 19)
  const montarMapa = useCallback((nodo) => {
    if (!nodo) return undefined;
    contenedor.current = nodo;
    const { hoyo: h, conMapa: orientado, centroSinMapa: delCampo } = inicio.current;
    // Sin la ubicación del campo, la salida del hoyo si la tiene (no España entera)
    const centro = delCampo ?? h?.playLine?.[0] ?? null;
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
      encuadrarHoyo(false);
    } else if (inicio.current.soloGreen && inicio.current.metros && h?.playLine?.[0]) {
      // Pidiendo solo el green: alejado la mitad de la tarjeta alrededor de la
      // salida aprobada, como al tocarla (16 oct)
      const alto = nodo.clientHeight || 640;
      mapa.fitBounds(limitesDelHoyo({ playLine: circuloAlrededor(h.playLine[0], inicio.current.metros / 2) }), {
        bearing: 0,
        padding: margenDelEncuadre(alto),
        animate: false,
      });
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
    if (!tocado) {
      marcaTocada.current?.remove();
      marcaTocada.current = null;
      return;
    }
    marcaTocada.current ??= new Marker({ element: punto('h-3.5 w-3.5 rounded-full border-2 border-white bg-yellow-400 shadow') }).setLngLat(lngLat(tocado)).addTo(mapa);
    marcaTocada.current.setLngLat(lngLat(tocado));
  }, [tocado]);

  // Las líneas de la medida y sus metros. Las etiquetas se mueven, no se
  // rehacen, con cada lectura del GPS
  const green = hoyoAhora?.green ?? null;
  const textoDeTramo = useCallback((metros) => t('mapa.tramo', { metros }), [t]);
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const tramos = tramosDeLaMedida(posicionEnElCampo, tocado, green);
    ultimaMedida.current = geojsonDeLaMedida(tramos);
    mapa.getSource('medida')?.setData(ultimaMedida.current);
    sincronizarCifras(mapa, etiquetasDeLaMedida.current, tramos, { tipo: 'medida', color: 'text-yellow-300', texto: textoDeTramo });
  }, [posicionEnElCampo, tocado, green, textoDeTramo]);

  // Los metros de cada tramo de la línea que se ve (Agustín, 16 oct: siempre que
  // se pinta una línea). No dependen del GPS: valen lejos del campo y sin señal
  const lineaVisible = useMemo(() => linea ?? hoyo?.playLine ?? [], [linea, hoyo]);
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
  const hoyoQueSeDibuja = useMemo(() => (linea ? { playLine: [], green: hoyoAhora?.green ?? null } : hoyo), [linea, hoyo, hoyoAhora]);
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

  // Mientras se pide, el doble toque no acerca: marcaría la salida y el green en el mismo sitio
  useEffect(() => {
    const zoom = mapaRef.current?.doubleClickZoom;
    if (pidiendo) zoom?.disable();
    else zoom?.enable();
  }, [pidiendo]);
  // La salida mientras se pide el green: la recién tocada o, pidiendo solo el
  // green, la aprobada (para ver desde dónde se mide)
  const salidaQueSePinta = pidiendo ? (marca.tee ?? (marcandoSalida ? null : (hoyo?.playLine?.[0] ?? null))) : null;
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
    if (!linea) return;
    const aqui = (e) => {
      const { lat, lng } = e.target.getLngLat();
      return { lat, lon: lng };
    };
    const con = (i, p) => linea.map((q, j) => (j === i ? p : q));
    // Una línea con más puntos que codos se guardan (las de OSM, con muchos):
    // se mueven la salida y el green; los de en medio siguen en la línea, sin punto
    const muchos = linea.length - 2 > MAX_CODOS;
    // Si la librería cambia y algo de esto falla, el mapa sigue (sin puntos que
    // mover) en vez de caerse entero; el fallo queda apuntado
    try {
      linea.forEach((p, i) => {
        if (muchos && i > 0 && i < linea.length - 1) return;
        const m = new Marker({ element: punto(CLASE_DEL_PUNTO[tipoDelPunto(i, linea)]), draggable: true })
          .setLngLat(lngLat(p))
          .addTo(mapa);
        // Apuntado en cuanto está en el mapa: si algo falla después, se quita
        puntosDeLaLinea.current.push(m);
        // Cada `on` aparte: en MapLibre 6 devuelve una suscripción, no el marcador
        m.on('drag', (e) => {
          const provisional = con(i, aqui(e));
          mapa.getSource('marcado')?.setData(geojsonDeLaLinea(provisional));
          cifrasAlArrastrar.current(provisional);
        });
        m.on('dragend', (e) => {
          const movida = con(i, aqui(e));
          setEdicion((ed) => ({ linea: movida, cambiada: true, version: ed.version + 1 }));
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
  }, [linea, datosDeLaLinea]);

  const empezarAMarcar = () => {
    setAvisoDeMarca(null);
    setTocado(null);
    setMarca({ fase: 'pidiendo', tee: null });
  };

  const fraseDeLaLinea = useMemo(() => {
    const lista = tramosDeLaLinea(lineaVisible).map(([p, q]) => distanciaEnMetros(p, q));
    const [a, b, c] = lista;
    const clave = [null, 'mapa.lineaUnTramo', 'mapa.lineaDosTramos', 'mapa.lineaTresTramos'][lista.length] ?? (lista.length ? 'mapa.lineaVariosTramos' : null);
    if (!clave) return null;
    return t(clave, lista.length > 3 ? { lista: lista.join(' · ') } : { a, b, c });
  }, [lineaVisible, t]);
  // Fijo, con los metros oficiales desde la salida: no mira el GPS (Agustín,
  // 16 oct). Sin metros en la tarjeta, se mide la línea como está ahora
  const distancias = useMemo(() => distanciasDelHoyo({ metros, hoyo: hoyoAhora }), [metros, hoyoAhora]);
  const hastaAhi = tocado && posicionEnElCampo ? distanciaEnMetros(posicionEnElCampo, tocado) : null;
  const deAhiAlGreen = tocado && green ? distanciaEnMetros(tocado, green.center) : null;
  const aviso = { buscando: t('mapa.buscando'), denegado: t('mapa.denegado'), 'no-disponible': t('mapa.noDisponible') }[gps.estado];

  return (
    // `ModalShell`: el foco entra (por «Cerrar», lo primero) y vuelve a «Mapa» al
    // cerrar, no se sale con el tabulador, Escape cierra y debajo no se desplaza
    <ModalShell isOpen onClose={onCerrar} closeOnBackdrop={false} labelledBy="titulo-del-mapa" boxClassName="fixed inset-x-0 inset-y-0 bg-gray-700">
      <div
        data-testid="mapa-arriba"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 pt-[calc(1rem+env(safe-area-inset-top))] pr-[calc(1rem+env(safe-area-inset-right))] pl-[calc(1rem+env(safe-area-inset-left))]"
      >
        <h2 id="titulo-del-mapa" className={`${PLACA} px-3.5 py-2 text-lg font-extrabold`}>{t('mapa.titulo', { numero: numeroDeHoyo, par })}</h2>
        <button type="button" onClick={onCerrar} className={`${BOTON} pointer-events-auto`}>
          <X className="h-4 w-4" aria-hidden="true" />
          {t('mapa.cerrar')}
        </button>
      </div>

      <div ref={montarMapa} className="absolute inset-0" />

      <div
        data-testid="mapa-abajo"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pr-[calc(1rem+env(safe-area-inset-right))] pl-[calc(1rem+env(safe-area-inset-left))]"
      >
        {sinMapa && <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{t('mapa.sinMapaEnEsteMovil')}</p>}
        {aviso && <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{aviso}</p>}

        {avisoDeMarca && <p role="alert" className={`${PLACA} self-start px-3.5 py-2 text-sm text-yellow-300`}>{avisoDeMarca}</p>}

        {sinMapa ? null : pidiendo ? (
          <div className={`${PLACA} pointer-events-auto flex items-center justify-between gap-2 px-3.5 py-2`}>
            <span aria-live="polite" className="text-base font-semibold">{t(marcandoSalida && !marca.tee ? 'mapa.pideSalida' : 'mapa.pideGreen')}</span>
            <button type="button" onClick={() => setMarca({ fase: 'pausado', tee: null })} className="min-h-11 px-2 text-sm font-semibold text-yellow-300 underline">
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
        ) : conAyudaDeCodos ? (
          <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{t('mapa.ayudaCodo')}</p>
        ) : (
          <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{t('mapa.ayudaMedir')}</p>
        )}

        {marca.fase === 'pausado' && !sinMapa && (
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
          <div className="grid grid-cols-[1fr_1.35fr_1fr] overflow-hidden rounded-2xl bg-white/95 text-gray-900 shadow-xl">
            <span className="sr-only">{t('mapa.etiqueta', distancias)}</span>
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
            <button type="button" onClick={() => encuadrarHoyo(true)} className={`${BOTON} pointer-events-auto`}>
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
