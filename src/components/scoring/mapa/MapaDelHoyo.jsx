import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, LocateFixed, Maximize2, MapPin, X } from 'lucide-react';
import { Map as MapaDeMapLibre, Marker, setWorkerUrl } from 'maplibre-gl';
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import './mapa.css';
import { distanciaEnMetros, distanciasAlGreen } from '../../../domain/services/distanciasAlGreen';
import { limitesDelHoyo, orientacionDelHoyo, rumbo } from '../../../domain/services/geometriaDelHoyo';
import {
  circuloAlrededor,
  difiereDeLaTarjeta,
  hoyoDeUnaMarca,
  longitudDeLaLinea,
  puntoDesde,
  puntosParaArrastrar,
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
    // Sin teselas (sin cobertura), gris: las distancias siguen, que solo dependen del GPS
    { id: 'fondo', type: 'background', paint: { 'background-color': '#6b7280' } },
    { id: 'pnoa', type: 'raster', source: 'pnoa' },
  ],
};
const ESPAÑA = { center: [-3.7, 40.4], zoom: 5 };
const ZOOM_SIN_MAPA = 17;

// Lo que tapan la cabecera y el panel de abajo, según el alto de la pantalla:
// fijo, en apaisado (~360 px) no cabía el hoyo y MapLibre no lo encuadraba
const margenDelEncuadre = (alto) => ({
  top: Math.round(Math.min(90, alto * 0.15)),
  bottom: Math.round(Math.min(240, alto * 0.4)),
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

// Lo que se está marcando (PR C): la línea de la salida al green y el arco de
// los metros de la tarjeta alrededor de la salida
const geojsonDelMarcado = ({ linea, arco }) => ({
  type: 'FeatureCollection',
  features: [
    ...(linea.length > 1 ? [{ type: 'Feature', properties: { tipo: 'linea' }, geometry: { type: 'LineString', coordinates: linea.map(lngLat) } }] : []),
    ...(arco ? [{ type: 'Feature', properties: { tipo: 'arco' }, geometry: { type: 'LineString', coordinates: arco.map(lngLat) } }] : []),
  ],
});

// Medir tocando: de ti al punto y del punto al centro del green, cada tramo
// con sus metros al lado (Agustín, 16 oct: mejor que un cuadro aparte)
const tramosDeLaMedida = (posicion, tocado, green) =>
  [posicion && tocado ? [posicion, tocado] : null, tocado && green ? [tocado, green.center] : null].filter(Boolean);
const geojsonDeLaMedida = (tramos) => ({
  type: 'FeatureCollection',
  features: tramos.map(([a, b]) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [lngLat(a), lngLat(b)] } })),
});
const enMedio = (a, b) => ({ lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 });


const punto = (clase) => {
  const el = globalThis.document.createElement('div');
  el.className = clase;
  return el;
};

const BOTON =
  'min-h-11 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 text-[15px] font-semibold text-gray-900 shadow-lg disabled:opacity-50';
const PLACA = 'rounded-xl bg-gray-950/85 text-white shadow-lg';
// El de guardar, verde: sobre BOTON no vale, porque su `bg-white` gana a `bg-green-600`
const BOTON_VERDE =
  'min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl bg-green-600 px-4 text-[15px] font-semibold text-white shadow-lg disabled:opacity-50';

/**
 * El mapa del hoyo a pantalla completa (BE #532), sobre la ortofoto del PNOA.
 *
 * Con mapa del hoyo: la salida abajo y el green arriba, sin giro, y el recuadro
 * de distancias al green desde el GPS. Sin mapa: norte arriba, giro libre, y
 * se mide tocando. El GPS va mientras el mapa está abierto, ni antes ni después.
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
  onGuardarMarca = null,
  onVolverAMarcar = null,
  onAhoraNo = null,
}) => {
  const { t } = useTranslation('scoring');
  const conMapa = orientacionDelHoyo(hoyo) !== null;
  const gps = usePosicionGps({ activo: true });
  const posicion = gps.estado === 'listo' ? gps.posicion : null;
  const centroSinMapa = useCentroSinMapa({ golfCourseId, activo: !conMapa });
  const [tocado, setTocado] = useState(null);
  // Sin WebGL (móviles viejos, o desactivado) no hay mapa, pero las distancias
  // al green solo piden el GPS
  const [sinMapa, setSinMapa] = useState(false);

  const contenedor = useRef(null);
  const mapaRef = useRef(null);
  const marcaGps = useRef(null);
  const marcaTocada = useRef(null);
  const centradoEnGps = useRef(false);
  const movidoPorElJugador = useRef(false);
  // Lo de la primera vez, sin rehacer el mapa si cambia mientras está abierto
  const inicio = useRef({ hoyo, conMapa, centroSinMapa });

  // Marcar el hoyo (PR C): sin salida, se piden la salida y el centro del
  // green; con salida, el green. «Ahora no» deja medir como siempre
  const [marca, setMarca] = useState({ fase: porMarcar && onGuardarMarca ? 'pidiendo' : null, tee: null, bends: [], green: null });
  const [avisoDeMarca, setAvisoDeMarca] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // El aviso de la tarjeta pide una respuesta: el foco va a ella
  const corregirRef = useRef(null);
  const conAvisoDeTarjeta = avisoDeMarca?.tipo === 'tarjeta';
  useEffect(() => {
    if (conAvisoDeTarjeta) corregirRef.current?.focus();
  }, [conAvisoDeTarjeta]);
  const marcandoSalida = porMarcar === 'salida';
  const salida = marcandoSalida ? marca.tee : (hoyo?.playLine?.[0] ?? null);
  const enMarcha = Boolean(marca.fase) && marca.fase !== 'pausado';
  // Memorizado: si cambiara en cada lectura del GPS, las marcas se rehacían y
  // se perdía el codo que se estaba arrastrando
  const lineaMarcada = useMemo(
    () =>
      marca.green
        ? (hoyoDeUnaMarca({ tee: marcandoSalida ? marca.tee : null, bends: marca.bends, greenCenter: marca.green }, hoyo)?.playLine ?? [])
        : [],
    [marca, marcandoSalida, hoyo],
  );
  const datosDelMarcado = useMemo(
    () => geojsonDelMarcado({ linea: lineaMarcada, arco: enMarcha && salida && metros ? circuloAlrededor(salida, metros) : null }),
    [lineaMarcada, enMarcha, salida, metros],
  );
  const ultimoMarcado = useRef(datosDelMarcado);
  const ultimaMedida = useRef(geojsonDeLaMedida([]));
  const etiquetasDeLaMedida = useRef([]);
  const marcasDelMarcado = useRef([]);

  // El toque: mientras se marca, marca; si no, mide. Por ref, porque el mapa
  // se monta una vez y su oyente vería el estado de entonces
  const alTocar = useRef(null);
  useLayoutEffect(() => {
    ultimoMarcado.current = datosDelMarcado;
    alTocar.current = (p) => {
      if (marca.fase === 'pidiendo') {
        setAvisoDeMarca(null);
        if (marcandoSalida && !marca.tee) setMarca((m) => ({ ...m, tee: p }));
        else setMarca((m) => ({ ...m, green: p, fase: 'ajustando' }));
        return;
      }
      if (marca.fase === 'ajustando') return;
      setTocado(p);
      // El mapa gira hacia el punto y os encuadra, contigo abajo (Agustín, 16 oct)
      if (posicion) {
        const alto = contenedor.current?.clientHeight || 640;
        mapaRef.current?.fitBounds(limitesDelHoyo({ playLine: [posicion, p] }), {
          bearing: rumbo(posicion, p),
          padding: margenDelEncuadre(alto),
          maxZoom: 18,
        });
      }
    };
  });

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
    const { hoyo: h, conMapa: orientado, centroSinMapa: centro } = inicio.current;
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
    }
    mapa.on('load', () => {
      mapa.addSource('hoyo', { type: 'geojson', data: geojsonDelHoyo(h) });
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
      mapa.addSource('marcado', { type: 'geojson', data: ultimoMarcado.current });
      mapa.addLayer({
        id: 'marcado-arco',
        type: 'line',
        source: 'marcado',
        filter: ['==', ['get', 'tipo'], 'arco'],
        paint: { 'line-color': '#facc15', 'line-width': 2, 'line-dasharray': [1, 2] },
      });
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
    if (!inicio.current.conMapa && !centradoEnGps.current) {
      centradoEnGps.current = true;
      mapa.jumpTo({ center: lngLat(posicion), zoom: ZOOM_SIN_MAPA });
    }
  }, [posicion]);

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
  const green = hoyo?.green ?? null;
  const textoDeTramo = useCallback((metros) => t('mapa.tramo', { metros }), [t]);
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const tramos = tramosDeLaMedida(posicion, tocado, green);
    ultimaMedida.current = geojsonDeLaMedida(tramos);
    mapa.getSource('medida')?.setData(ultimaMedida.current);
    const etiquetas = etiquetasDeLaMedida.current;
    while (etiquetas.length > tramos.length) etiquetas.pop().remove();
    tramos.forEach(([a, b], i) => {
      etiquetas[i] ??= new Marker({ element: punto('rounded-md bg-gray-950/85 px-1.5 py-0.5 font-mono text-sm font-bold text-yellow-300 shadow') })
        .setLngLat(lngLat(enMedio(a, b)))
        .addTo(mapa);
      etiquetas[i].setLngLat(lngLat(enMedio(a, b)));
      etiquetas[i].getElement().textContent = textoDeTramo(distanciaEnMetros(a, b));
    });
  }, [posicion, tocado, green, textoDeTramo]);

  // La ubicación del campo llega después de abrir: centra el mapa si aún no lo
  // hizo el GPS ni el jugador lo ha movido
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !centroSinMapa || inicio.current.conMapa || inicio.current.centroSinMapa) return;
    if (centradoEnGps.current || movidoPorElJugador.current) return;
    inicio.current.centroSinMapa = centroSinMapa;
    mapa.jumpTo({ center: lngLat(centroSinMapa), zoom: ZOOM_SIN_MAPA });
  }, [centroSinMapa]);

  // Lo que se está marcando, sobre el mapa: la línea y el arco, y como marcas
  // la salida, el green, los codos y los puntos que se arrastran para hacerlos
  const textoDelArco = metros ? t('mapa.arco', { metros }) : null;
  // Mientras se marca, el doble toque no acerca: marcaría la salida y el green en el mismo sitio
  useEffect(() => {
    const zoom = mapaRef.current?.doubleClickZoom;
    if (enMarcha) zoom?.disable();
    else zoom?.enable();
  }, [enMarcha]);
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    mapa.getSource('marcado')?.setData(datosDelMarcado);
    for (const m of marcasDelMarcado.current) m.remove();
    marcasDelMarcado.current = [];
    if (!enMarcha) return;
    const poner = (p, clase, opciones = {}) => {
      const m = new Marker({ element: punto(clase), ...opciones }).setLngLat(lngLat(p)).addTo(mapa);
      marcasDelMarcado.current.push(m);
      return m;
    };
    if (marcandoSalida && marca.tee) poner(marca.tee, 'h-4 w-4 rounded-full border-[3px] border-gray-900 bg-white shadow');
    if (marca.green) poner(marca.green, 'h-4 w-4 rounded-full border-[3px] border-white bg-yellow-400 shadow');
    if (salida && metros) {
      const etiqueta = punto('rounded-md bg-gray-950/85 px-1.5 py-0.5 text-xs font-bold text-yellow-300');
      etiqueta.textContent = textoDelArco;
      marcasDelMarcado.current.push(new Marker({ element: etiqueta }).setLngLat(lngLat(puntoDesde(salida, 0, metros))).addTo(mapa));
    }
    if (marca.fase === 'ajustando' && marcandoSalida) {
      // Cada codo se puede volver a arrastrar
      marca.bends.forEach((codo, i) => {
        poner(codo, 'h-5 w-5 rounded-full border-[3px] border-white bg-gray-900/70 shadow', { draggable: true }).on('dragend', (e) => {
          const { lat, lng } = e.target.getLngLat();
          setMarca((m) => ({ ...m, bends: m.bends.map((b, j) => (j === i ? { lat, lon: lng } : b)) }));
        });
      });
      // Y en mitad de cada tramo, un punto que al soltarlo se convierte en codo
      for (const { indice, punto: medio } of puntosParaArrastrar(lineaMarcada)) {
        poner(medio, 'h-5 w-5 rounded-full border-2 border-dashed border-white bg-white/40 shadow', { draggable: true }).on('dragend', (e) => {
          const { lat, lng } = e.target.getLngLat();
          setMarca((m) => {
            const bends = [...m.bends];
            bends.splice(indice - 1, 0, { lat, lon: lng });
            return { ...m, bends };
          });
        });
      }
    }
  }, [datosDelMarcado, enMarcha, marca, marcandoSalida, salida, metros, lineaMarcada, textoDelArco]);

  const empezarAMarcar = () => {
    setAvisoDeMarca(null);
    setTocado(null);
    setMarca({ fase: 'pidiendo', tee: null, bends: [], green: null });
  };

  const guardarMarca = async (confirmado = false) => {
    if (salidaGreenFueraDeLimites(salida, marca.green)) {
      setAvisoDeMarca({ tipo: 'error', texto: t('mapa.fueraDeLimites') });
      return;
    }
    const marcado = longitudDeLaLinea(lineaMarcada);
    if (!confirmado && difiereDeLaTarjeta(marcado, metros)) {
      setAvisoDeMarca({ tipo: 'tarjeta', marcado, tarjeta: metros });
      return;
    }
    setAvisoDeMarca(null);
    setGuardando(true);
    let resultado;
    try {
      resultado = await onGuardarMarca({
        tee: marcandoSalida ? marca.tee : null,
        bends: marca.bends, // sin salida propia no hay codos que arrastrar
        greenCenter: marca.green,
      });
    } catch (error) {
      captureError(error, { tags: { modulo: 'marcas-de-hoyos' } });
      setAvisoDeMarca({ tipo: 'error', texto: t('mapa.noSeGuardo') });
      resultado = { estado: 'rechazada', errorCode: null };
    }
    // Guardada (o pendiente de enviar), la ventana rehace el mapa con el hoyo
    // marcado; si el servidor la rechaza, lo dice ella. Aquí solo se vuelve a poder pulsar
    if (resultado?.estado === 'rechazada') setGuardando(false);
  };

  const distancias = distanciasAlGreen(posicion, hoyo?.green);
  const hastaAhi = tocado && posicion ? distanciaEnMetros(posicion, tocado) : null;
  const deAhiAlGreen = tocado && hoyo?.green ? distanciaEnMetros(tocado, hoyo.green.center) : null;
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

        {avisoDeMarca?.tipo === 'error' && <p role="alert" className={`${PLACA} self-start px-3.5 py-2 text-sm text-yellow-300`}>{avisoDeMarca.texto}</p>}

        {sinMapa ? null : avisoDeMarca?.tipo === 'tarjeta' ? (
          <div role="alertdialog" aria-describedby="aviso-de-la-tarjeta" className={`${PLACA} pointer-events-auto flex flex-col gap-2 px-3.5 py-3`}>
            <p id="aviso-de-la-tarjeta" className="text-sm">{t('mapa.avisoTarjeta', avisoDeMarca)}</p>
            <div className="flex gap-2">
              <button ref={corregirRef} type="button" onClick={() => setAvisoDeMarca(null)} className={`${BOTON} flex-1 justify-center`}>
                {t('mapa.corregir')}
              </button>
              <button type="button" disabled={guardando} onClick={() => guardarMarca(true)} className={`${BOTON_VERDE} flex-1`}>
                {t('mapa.siGuardar')}
              </button>
            </div>
          </div>
        ) : marca.fase === 'pidiendo' ? (
          <div className={`${PLACA} pointer-events-auto flex items-center justify-between gap-2 px-3.5 py-2`}>
            <span aria-live="polite" className="text-base font-semibold">{t(marcandoSalida && !marca.tee ? 'mapa.pideSalida' : 'mapa.pideGreen')}</span>
            <button type="button" onClick={onAhoraNo ?? (() => setMarca((m) => ({ ...m, fase: 'pausado' })))} className="min-h-11 px-2 text-sm font-semibold text-yellow-300 underline">
              {t('mapa.ahoraNo')}
            </button>
          </div>
        ) : marca.fase === 'ajustando' ? (
          <div className="pointer-events-auto flex flex-col gap-2">
            {marcandoSalida && marca.bends.length < 2 && <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{t('mapa.ayudaCodo')}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={empezarAMarcar} className={`${BOTON} flex-1 justify-center`}>
                {t('mapa.volverAMarcar')}
              </button>
              <button type="button" disabled={guardando} onClick={() => guardarMarca()} className={`${BOTON_VERDE} flex-1`}>
                {t('mapa.guardarMarca')}
              </button>
            </div>
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
        ) : (
          <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{t('mapa.ayudaMedir')}</p>
        )}

        {(marca.fase === 'pausado' || onVolverAMarcar) && !sinMapa && (
          <button type="button" onClick={onVolverAMarcar ?? empezarAMarcar} className={`${BOTON} pointer-events-auto self-end`}>
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {t(onVolverAMarcar ? 'mapa.volverAMarcar' : 'mapa.marcarHoyo')}
          </button>
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
              disabled={!posicion}
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
