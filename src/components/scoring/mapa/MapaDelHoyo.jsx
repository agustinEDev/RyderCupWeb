import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, LocateFixed, Maximize2, X } from 'lucide-react';
import { Map as MapaDeMapLibre, Marker, setWorkerUrl } from 'maplibre-gl';
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import './mapa.css';
import { distanciaEnMetros, distanciasAlGreen } from '../../../domain/services/distanciasAlGreen';
import { limitesDelHoyo, orientacionDelHoyo } from '../../../domain/services/geometriaDelHoyo';
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

const punto = (clase) => {
  const el = globalThis.document.createElement('div');
  el.className = clase;
  return el;
};

const BOTON =
  'min-h-11 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 text-[15px] font-semibold text-gray-900 shadow-lg disabled:opacity-50';
const PLACA = 'rounded-xl bg-gray-950/85 text-white shadow-lg';

/**
 * El mapa del hoyo a pantalla completa (BE #532), sobre la ortofoto del PNOA.
 *
 * Con mapa del hoyo: la salida abajo y el green arriba, sin giro, y el recuadro
 * de distancias al green desde el GPS. Sin mapa: norte arriba, giro libre, y
 * se mide tocando. El GPS va mientras el mapa está abierto, ni antes ni después.
 */
const MapaDelHoyo = ({ golfCourseId, numeroDeHoyo, par, hoyo, atribucion, onCerrar }) => {
  const { t } = useTranslation('scoring');
  const conMapa = orientacionDelHoyo(hoyo) !== null;
  const gps = usePosicionGps({ activo: true });
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
    mapa.on('click', (e) => setTocado({ lat: e.lngLat.lat, lon: e.lngLat.lng }));
    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
  }, [encuadrarHoyo]);

  // Mi posición: el punto azul, y la primera vez sin mapa, el mapa va a ella
  const posicion = gps.estado === 'listo' ? gps.posicion : null;
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

  // La ubicación del campo llega después de abrir: centra el mapa si aún no lo
  // hizo el GPS ni el jugador lo ha movido
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !centroSinMapa || inicio.current.conMapa || inicio.current.centroSinMapa) return;
    if (centradoEnGps.current || movidoPorElJugador.current) return;
    inicio.current.centroSinMapa = centroSinMapa;
    mapa.jumpTo({ center: lngLat(centroSinMapa), zoom: ZOOM_SIN_MAPA });
  }, [centroSinMapa]);

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

        {sinMapa ? null : tocado ? (
          <div className={`${PLACA} pointer-events-auto flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 font-mono text-base`}>
            <span className="flex flex-col">
              {hastaAhi !== null && <span>{t('mapa.hastaAhi', { metros: hastaAhi })}</span>}
              {deAhiAlGreen !== null && <span>{t('mapa.deAhiAlGreen', { metros: deAhiAlGreen })}</span>}
            </span>
            <button type="button" onClick={() => setTocado(null)} className="min-h-11 px-2 font-sans text-sm font-semibold text-yellow-300 underline">
              {t('mapa.quitarPunto')}
            </button>
          </div>
        ) : (
          <p className={`${PLACA} self-start px-3.5 py-2 text-sm`}>{t('mapa.ayudaMedir')}</p>
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
