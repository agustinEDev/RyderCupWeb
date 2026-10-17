import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Map as MapaDeMapLibre, Marker, setWorkerUrl } from 'maplibre-gl';
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import '../../scoring/mapa/mapa.css';
import { TESELAS_PNOA } from '../../scoring/mapa/teselas';
import { lineaDePuntos, puntosDeLaLinea } from '../../../domain/services/hoyoMarcado';

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
const comoPuntos = (puntos) => coleccion(puntos.map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: lngLat(p) } })));
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
const SIN_MARCAR = [];

const MapaDeRevision = ({
  muestras,
  guardada,
  linea,
  onLinea,
  onToque,
  marcados = SIN_MARCAR,
  centro = null,
  posicion = null,
  centrarEnMi = 0,
  bloqueada = false,
}) => {
  const { t } = useTranslation('admin');
  const nombreDe = (i, total) => t(i === 0 ? 'holeReviews.pointTee' : i === total - 1 ? 'holeReviews.pointGreen' : 'holeReviews.pointBend');
  const contenedor = useRef(null);
  const mapaRef = useRef(null);
  const cargado = useRef(false);
  const puntos = useRef([]);
  // El centro de partida solo cuenta al montar: va con lo demás
  const datos = useRef({ muestras, guardada, linea, onLinea, onToque, marcados, centro, posicion, centrarEnMi, bloqueada });
  // Hasta qué pedido de «Mi posición» se ha centrado ya el mapa
  const centradoPara = useRef(0);
  useLayoutEffect(() => {
    datos.current = { muestras, guardada, linea, onLinea, onToque, marcados, centro, posicion, centrarEnMi, bloqueada };
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
      // Mientras se marca desde cero, la línea de antes no se arrastra sin querer
      const marca = new Marker({ element: elemento, draggable: !datos.current.bloqueada }).setLngLat(lngLat(p)).addTo(mapa);
      marca.on('dragend', (e) => {
        const { lat, lng } = e.target.getLngLat();
        const deAhora = puntosDeLaLinea(datos.current.linea);
        datos.current.onLinea(lineaDePuntos(deAhora.map((q, j) => (j === i ? { lat, lon: lng } : q))));
      });
      return marca;
    });
  };

  // «Mi posición» (E14): se pinta siempre que la haya, y el mapa se centra en
  // ella una vez por cada vez que se pide (aunque llegue después del toque, o
  // antes de que cargue el mapa)
  const centrarEnLaPosicion = () => {
    const mapa = mapaRef.current;
    if (!mapa || !cargado.current) return;
    const { posicion: yo, centrarEnMi: pedido } = datos.current;
    mapa.getSource('yo')?.setData(comoPuntos(yo ? [yo] : []));
    if (yo && pedido > centradoPara.current) {
      centradoPara.current = pedido;
      mapa.easeTo({ center: lngLat(yo), zoom: Math.max(mapa.getZoom?.() ?? 16, 16) });
    }
  };

  // La de ahora, por ref: el mapa se monta una vez y sus oyentes la llaman
  const pintar = useRef(pintarLinea);
  const centrar = useRef(centrarEnLaPosicion);
  useLayoutEffect(() => {
    pintar.current = pintarLinea;
    centrar.current = centrarEnLaPosicion;
  });

  useEffect(() => {
    // Sin nada que encuadrar (un hoyo sin muestras), se parte del campo
    const { centro: deInicio } = datos.current;
    const inicio = deInicio ? { center: lngLat(deInicio), zoom: 16 } : { center: [-3.7, 40.4], zoom: 5 };
    const mapa = new MapaDeMapLibre({ container: contenedor.current, style: ESTILO, attributionControl: false, ...inicio });
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
      // Lo ya tocado al marcar desde cero (la salida, mientras se toca el green)
      mapa.addSource('marcados', { type: 'geojson', data: comoPuntos(datos.current.marcados) });
      mapa.addSource('yo', { type: 'geojson', data: comoPuntos(datos.current.posicion ? [datos.current.posicion] : []) });
      mapa.addLayer({ id: 'yo', type: 'circle', source: 'yo', paint: { 'circle-radius': 7, 'circle-color': '#2563eb', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
      mapa.addLayer({ id: 'marcados', type: 'circle', source: 'marcados', paint: { 'circle-radius': 8, 'circle-color': COLOR_DE_LA_LINEA, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
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
      // La posición pudo llegar antes de que cargara
      centrar.current();
    });
    // Tocar el mapa solo cuenta mientras se marca
    mapa.on('click', (e) => datos.current.onToque?.({ lat: e.lngLat.lat, lon: e.lngLat.lng }));
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

  useEffect(() => {
    if (cargado.current) mapaRef.current?.getSource('marcados')?.setData(comoPuntos(marcados));
  }, [marcados]);

  useEffect(() => centrar.current(), [posicion, centrarEnMi]);

  useEffect(() => {
    for (const m of puntos.current) m.setDraggable(!bloqueada);
  }, [bloqueada]);

  return <div ref={contenedor} className="absolute inset-0" />;
};

export default MapaDeRevision;
