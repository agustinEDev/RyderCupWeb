import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Map as MapaDeMapLibre, Marker, setWorkerUrl } from 'maplibre-gl';
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import '../../scoring/mapa/mapa.css';
import { TESELAS_PNOA } from '../../scoring/mapa/teselas';
import { puntosDeLaLinea } from '../../../domain/services/hoyoMarcado';

setWorkerUrl(urlDelWorker);

// El color de cada barra en el mapa (las OTHER y las que no se conocen, morado)
const COLOR_DE_LA_BARRA = {
  WHITE: '#ffffff',
  YELLOW: '#facc15',
  BLUE: '#3b82f6',
  RED: '#ef4444',
  BLACK: '#111827',
  GREEN: '#22c55e',
  ORANGE: '#f97316',
  PINK: '#ec4899',
  GOLD: '#ca8a04',
};
const colorDe = (barra) => COLOR_DE_LA_BARRA[barra?.color] ?? '#a855f7';

const lngLat = (p) => [p.lon, p.lat];
const coleccion = (features) => ({ type: 'FeatureCollection', features });
const comoLinea = (linea, properties = {}) =>
  linea ? [{ type: 'Feature', properties, geometry: { type: 'LineString', coordinates: puntosDeLaLinea(linea).map(lngLat) } }] : [];
const deLasMuestras = (muestras) =>
  coleccion(
    muestras.map((m) =>
      m.tee
        ? comoLinea(m, { color: colorDe(m.barra) })[0]
        : { type: 'Feature', properties: { color: colorDe(m.barra) }, geometry: { type: 'Point', coordinates: lngLat(m.greenCenter) } },
    ),
  );

const ESTILO = {
  version: 8,
  sources: { pnoa: { type: 'raster', tiles: [TESELAS_PNOA], tileSize: 256, maxzoom: 20 } },
  layers: [
    { id: 'fondo', type: 'background', paint: { 'background-color': '#6b7280' } },
    { id: 'pnoa', type: 'raster', source: 'pnoa' },
  ],
};

// 44 px donde tocar (con el dedo, en el móvil) y el punto de 20 px dentro
const CLASE_DEL_PUNTO = 'h-11 w-11 flex items-center justify-center';
const CLASE_DE_LA_BOLA = 'h-5 w-5 rounded-full border-[3px] border-white bg-fuchsia-600 shadow';
// Lo guardado y lo que se edita, en colores que no lleva ninguna barra
const COLOR_DE_LO_GUARDADO = '#06b6d4';
const COLOR_DE_LA_LINEA = '#d946ef';

/**
 * El mapa de revisar un hoyo (BE #575, 17 oct 2026), sobre la ortofoto del
 * PNOA: cada muestra con el color de su barra (una solo green, un punto), la
 * línea guardada en cian discontinuo y la que el admin edita en magenta (colores
 * que no lleva ninguna barra), con su salida, sus codos y su green arrastrables. Al soltar un punto, `onLinea` recibe la línea movida.
 */
const MapaDeRevision = ({ muestras, guardada, linea, onLinea }) => {
  const { t } = useTranslation('admin');
  const nombreDe = (i, total) => t(i === 0 ? 'holeReviews.pointTee' : i === total - 1 ? 'holeReviews.pointGreen' : 'holeReviews.pointBend');
  const contenedor = useRef(null);
  const mapaRef = useRef(null);
  const cargado = useRef(false);
  const puntos = useRef([]);
  const datos = useRef({ muestras, guardada, linea, onLinea });
  useLayoutEffect(() => {
    datos.current = { muestras, guardada, linea, onLinea };
  });

  // La línea que se edita y sus puntos. Con los mismos puntos, se mueven (no
  // se rehacen, también justo después de arrastrar uno); si cambian, de nuevo
  const pintarLinea = () => {
    const mapa = mapaRef.current;
    if (!mapa || !cargado.current) return;
    const { linea: actual } = datos.current;
    mapa.getSource('linea')?.setData(coleccion(comoLinea(actual)));
    const lista = actual ? puntosDeLaLinea(actual) : [];
    if (puntos.current.length === lista.length) {
      lista.forEach((p, i) => puntos.current[i].setLngLat(lngLat(p)));
      return;
    }
    for (const m of puntos.current) m.remove();
    puntos.current = lista.map((p, i) => {
      const elemento = globalThis.document.createElement('div');
      elemento.className = CLASE_DEL_PUNTO;
      elemento.setAttribute('aria-label', nombreDe(i, lista.length));
      const bola = globalThis.document.createElement('div');
      bola.className = CLASE_DE_LA_BOLA;
      elemento.appendChild(bola);
      const marca = new Marker({ element: elemento, draggable: true }).setLngLat(lngLat(p)).addTo(mapa);
      marca.on('dragend', (e) => {
        const { lat, lng } = e.target.getLngLat();
        const deAhora = puntosDeLaLinea(datos.current.linea);
        const movida = deAhora.map((q, j) => (j === i ? { lat, lon: lng } : q));
        datos.current.onLinea({ tee: movida[0], bends: movida.slice(1, -1), greenCenter: movida.at(-1) });
      });
      return marca;
    });
  };

  // La de ahora, por ref: el mapa se monta una vez y sus oyentes la llaman
  const pintar = useRef(pintarLinea);
  useLayoutEffect(() => {
    pintar.current = pintarLinea;
  });

  useEffect(() => {
    const mapa = new MapaDeMapLibre({ container: contenedor.current, style: ESTILO, attributionControl: false, center: [-3.7, 40.4], zoom: 5 });
    mapaRef.current = mapa;
    mapa.on('load', () => {
      const { muestras: todas, guardada: lo, linea: actual } = datos.current;
      mapa.addSource('muestras', { type: 'geojson', data: deLasMuestras(todas) });
      mapa.addLayer({ id: 'muestras-lineas', type: 'line', source: 'muestras', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-opacity': 0.85 } });
      mapa.addLayer({ id: 'muestras-greens', type: 'circle', source: 'muestras', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#000', 'circle-stroke-width': 1 } });
      mapa.addSource('guardada', { type: 'geojson', data: coleccion(comoLinea(lo)) });
      mapa.addLayer({ id: 'guardada', type: 'line', source: 'guardada', paint: { 'line-color': COLOR_DE_LO_GUARDADO, 'line-width': 3, 'line-dasharray': [2, 2] } });
      mapa.addSource('linea', { type: 'geojson', data: coleccion(comoLinea(actual)) });
      mapa.addLayer({ id: 'linea', type: 'line', source: 'linea', paint: { 'line-color': COLOR_DE_LA_LINEA, 'line-width': 4 } });
      cargado.current = true;
      // Todo a la vista: las muestras, lo guardado y la línea
      const todos = [...todas.flatMap((m) => (m.tee ? puntosDeLaLinea(m) : [m.greenCenter])), ...(lo ? puntosDeLaLinea(lo) : []), ...(actual ? puntosDeLaLinea(actual) : [])];
      if (todos.length) {
        const lats = todos.map((p) => p.lat);
        const lons = todos.map((p) => p.lon);
        mapa.fitBounds(
          [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
          ],
          { padding: 40, maxZoom: 18, animate: false },
        );
      }
      pintar.current();
    });
    return () => {
      for (const m of puntos.current) m.remove();
      puntos.current = [];
      cargado.current = false;
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !cargado.current) return;
    mapa.getSource('muestras')?.setData(deLasMuestras(muestras));
    mapa.getSource('guardada')?.setData(coleccion(comoLinea(guardada)));
  }, [muestras, guardada]);

  useEffect(() => pintar.current(), [linea]);

  return <div ref={contenedor} className="absolute inset-0" />;
};

export default MapaDeRevision;
