import { useEffect, useLayoutEffect, useRef } from 'react';
import { Map as MapaDeMapLibre, Marker, setWorkerUrl } from 'maplibre-gl';
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import '../../scoring/mapa/mapa.css';
import { TESELAS_PNOA } from '../../scoring/mapa/teselas';

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
const puntosDe = (linea) => [linea.tee, ...linea.bends, linea.greenCenter];
const coleccion = (features) => ({ type: 'FeatureCollection', features });
const comoLinea = (linea, properties = {}) =>
  linea ? [{ type: 'Feature', properties, geometry: { type: 'LineString', coordinates: puntosDe(linea).map(lngLat) } }] : [];
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

const CLASE_DEL_PUNTO = 'h-5 w-5 rounded-full border-[3px] border-white bg-gray-900/80 shadow';

/**
 * El mapa de revisar un hoyo (BE #575, 17 oct 2026), sobre la ortofoto del
 * PNOA: cada muestra con el color de su barra (una solo green, un punto), la
 * línea guardada discontinua y la que el admin edita, con su salida, sus codos
 * y su green arrastrables. Al soltar un punto, `onLinea` recibe la línea movida.
 */
const MapaDeRevision = ({ muestras, guardada, linea, onLinea }) => {
  const contenedor = useRef(null);
  const mapaRef = useRef(null);
  const cargado = useRef(false);
  const puntos = useRef([]);
  const datos = useRef({ muestras, guardada, linea, onLinea });
  useLayoutEffect(() => {
    datos.current = { muestras, guardada, linea, onLinea };
  });

  // La línea que se edita y sus puntos, cada vez que cambia
  const pintarLinea = () => {
    const mapa = mapaRef.current;
    if (!mapa || !cargado.current) return;
    const { linea: actual, onLinea: avisar } = datos.current;
    mapa.getSource('linea')?.setData(coleccion(comoLinea(actual)));
    for (const m of puntos.current) m.remove();
    puntos.current = [];
    if (!actual) return;
    const lista = puntosDe(actual);
    lista.forEach((p, i) => {
      const elemento = globalThis.document.createElement('div');
      elemento.className = CLASE_DEL_PUNTO;
      const marca = new Marker({ element: elemento, draggable: true }).setLngLat(lngLat(p)).addTo(mapa);
      marca.on('dragend', (e) => {
        const { lat, lng } = e.target.getLngLat();
        const movida = lista.map((q, j) => (j === i ? { lat, lon: lng } : q));
        avisar({ tee: movida[0], bends: movida.slice(1, -1), greenCenter: movida.at(-1) });
      });
      puntos.current.push(marca);
    });
  };

  useEffect(() => {
    const mapa = new MapaDeMapLibre({ container: contenedor.current, style: ESTILO, attributionControl: false, center: [-3.7, 40.4], zoom: 5 });
    mapaRef.current = mapa;
    mapa.on('load', () => {
      const { muestras: todas, guardada: lo, linea: actual } = datos.current;
      mapa.addSource('muestras', { type: 'geojson', data: deLasMuestras(todas) });
      mapa.addLayer({ id: 'muestras-lineas', type: 'line', source: 'muestras', paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-opacity': 0.85 } });
      mapa.addLayer({ id: 'muestras-greens', type: 'circle', source: 'muestras', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#000', 'circle-stroke-width': 1 } });
      mapa.addSource('guardada', { type: 'geojson', data: coleccion(comoLinea(lo)) });
      mapa.addLayer({ id: 'guardada', type: 'line', source: 'guardada', paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [2, 2] } });
      mapa.addSource('linea', { type: 'geojson', data: coleccion(comoLinea(actual)) });
      mapa.addLayer({ id: 'linea', type: 'line', source: 'linea', paint: { 'line-color': '#16a34a', 'line-width': 4 } });
      cargado.current = true;
      // Todo a la vista: las muestras, lo guardado y la línea
      const todos = [...todas.flatMap((m) => (m.tee ? puntosDe(m) : [m.greenCenter])), ...(lo ? puntosDe(lo) : []), ...(actual ? puntosDe(actual) : [])];
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
      pintarLinea();
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

  useEffect(pintarLinea, [linea]);

  return <div ref={contenedor} className="absolute inset-0" />;
};

export default MapaDeRevision;
