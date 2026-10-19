import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Map as MapaDeMapLibre, Marker, setWorkerUrl } from 'maplibre-gl';
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import '../../scoring/mapa/mapa.css';
import { TESELAS_PNOA, atribucionDeLaOrtofoto, ponerOrtofoto } from '../../scoring/mapa/teselas';
import { comunidadDelPunto } from '../../../domain/services/comunidadDelCampo';
import { lineaDePuntos, puntosDeLaLinea } from '../../../domain/services/hoyoMarcado';
import { camaraGirada, rumboDeLaLinea } from '../../../domain/services/geometriaDelHoyo';

setWorkerUrl(urlDelWorker);

// Todas las muestras y reportes del mismo color: ninguna distinción de barras
// en los mapas (Agustín, 18 oct)
const COLOR_DE_LAS_MUESTRAS = '#ffffff';

const lngLat = (p) => [p.lon, p.lat];
const coleccion = (features) => ({ type: 'FeatureCollection', features });
const comoPuntos = (puntos) => coleccion(puntos.map((p) => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: lngLat(p) } })));
const comoLinea = (linea, properties = {}) =>
  linea ? [{ type: 'Feature', properties, geometry: { type: 'LineString', coordinates: puntosDeLaLinea(linea).map(lngLat) } }] : [];
// Con su id y su sitio en la lista: tocada en el mapa, se elige (M1-M4)
const deLasMuestras = (muestras) =>
  coleccion(
    muestras.map((m, orden) => {
      const properties = { id: m.id, orden };
      return m.tee ? comoLinea(m, properties)[0] : { type: 'Feature', properties, geometry: { type: 'Point', coordinates: lngLat(m.greenCenter) } };
    }),
  );
// Para acertar con el dedo, una franja invisible más ancha que lo que se ve (M3)
const CAPAS_DE_TOQUE = ['muestras-toque-lineas', 'muestras-toque-greens'];

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
const CLASE_DE_LA_BOLA = 'h-5 w-5 rounded-full border-[3px] border-white bg-red-600 shadow';
// Lo guardado en cian; lo que se edita (y un green suelto seleccionado),
// siempre en rojo (Agustín, 18 oct)
const COLOR_DE_LO_GUARDADO = '#06b6d4';
const COLOR_DE_LA_LINEA = '#dc2626';
// La del mapa de OSM aprobado (17 oct)
const COLOR_DE_OSM = '#84cc16';
const comoLineaDeOsm = (puntos) =>
  puntos?.length > 1 ? coleccion([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: puntos.map(lngLat) } }]) : coleccion([]);

/**
 * El mapa de revisar un hoyo (BE #575, 17 oct 2026), sobre la ortofoto del
 * PNOA: las muestras y los reportes, todos en blanco y finos (una solo green,
 * un punto), la línea guardada en cian discontinuo y la que el admin edita en
 * rojo, con su salida, sus codos y su green arrastrables. Al soltar un punto,
 * `onLinea` recibe la línea movida. `destacado`: el green suelto seleccionado,
 * en rojo.
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
  osm = null,
  destacado = null,
  onElegir,
  par = null,
  orientar = 0,
}) => {
  const { t } = useTranslation('admin');
  const { t: tMapa } = useTranslation('scoring');
  const nombreDe = (i, total) => t(i === 0 ? 'holeReviews.pointTee' : i === total - 1 ? 'holeReviews.pointGreen' : 'holeReviews.pointBend');
  const contenedor = useRef(null);
  const mapaRef = useRef(null);
  const cargado = useRef(false);
  // La ortofoto de la comunidad del campo, como la ve el jugador (O9, 19 oct):
  // por su ubicación o, sin ella, por la salida de la línea
  // Solo cuando cambia ese punto, no en cada arrastre de la salida (/code-review)
  const delCampo = centro ?? linea?.tee ?? null;
  const latDelCampo = delCampo?.lat ?? null;
  const lonDelCampo = delCampo?.lon ?? null;
  const comunidad = useMemo(
    () => comunidadDelPunto(latDelCampo === null || lonDelCampo === null ? null : { lat: latDelCampo, lon: lonDelCampo }),
    [latDelCampo, lonDelCampo],
  );
  const comunidadAhora = useRef(comunidad);
  const puntos = useRef([]);
  // El centro de partida solo cuenta al montar: va con lo demás
  const datos = useRef({ muestras, guardada, linea, onLinea, onToque, marcados, centro, posicion, centrarEnMi, bloqueada, osm, destacado, onElegir, par, orientar });
  // Hasta qué pedido de «Mi posición» se ha centrado ya el mapa
  const centradoPara = useRef(0);
  useLayoutEffect(() => {
    datos.current = { muestras, guardada, linea, onLinea, onToque, marcados, centro, posicion, centrarEnMi, bloqueada, osm, destacado, onElegir, par, orientar };
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

  // Todo lo que hay: las muestras y los reportes, lo guardado, la línea y OSM
  const todosLosPuntos = () => {
    const { muestras: todas, guardada: lo, linea: actual, osm: deOsm } = datos.current;
    return [...todas.flatMap((m) => (m.tee ? puntosDeLaLinea(m) : [m.greenCenter])), ...(lo ? puntosDeLaLinea(lo) : []), ...(actual ? puntosDeLaLinea(actual) : []), ...(deOsm ?? [])];
  };
  // Como el mapa del jugador (Agustín, 18 oct): girado como se juega la línea
  // roja (par 3 al green, 4 o 5 al primer codo), una vez por cada vez que se
  // pide (A1, A2, A4, A6), con todo a la vista (A1b). Sin línea, nada. Se
  // puede girar con los dedos (A6)
  // Sin línea, todo a la vista y el norte arriba (A1c)
  const verTodoAlNorte = () => {
    const todos = todosLosPuntos();
    if (!todos.length) return;
    const lats = todos.map((p) => p.lat);
    const lons = todos.map((p) => p.lon);
    mapaRef.current.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: 40, maxZoom: 18, animate: false, bearing: 0 },
    );
  };
  const orientarLaLinea = (animar) => {
    const mapa = mapaRef.current;
    const { linea: actual, par: delHoyo } = datos.current;
    if (!mapa || !cargado.current) return;
    // Quitada la línea (al recargar), de vuelta al norte (CodeRabbit)
    if (!actual) {
      verTodoAlNorte();
      return;
    }
    const girada = camaraGirada({ playLine: todosLosPuntos(), green: null }, rumboDeLaLinea(puntosDeLaLinea(actual), delHoyo), {
      ancho: contenedor.current?.clientWidth || 360,
      alto: contenedor.current?.clientHeight || 640,
      // Abajo, «Mi posición» y «Orientar»; arriba, la instrucción al marcar (revisor)
      padding: { top: 64, bottom: 120, left: 40, right: 40 },
    });
    // Con línea siempre hay rumbo y puntos
    const camara = { ...girada, center: lngLat(girada.center) };
    if (animar) mapa.easeTo(camara);
    else mapa.jumpTo(camara);
  };

  // La de ahora, por ref: el mapa se monta una vez y sus oyentes la llaman
  const orientarAhora = useRef(orientarLaLinea);
  const verTodo = useRef(verTodoAlNorte);
  const pintar = useRef(pintarLinea);
  const centrar = useRef(centrarEnLaPosicion);
  useLayoutEffect(() => {
    pintar.current = pintarLinea;
    centrar.current = centrarEnLaPosicion;
    orientarAhora.current = orientarLaLinea;
    verTodo.current = verTodoAlNorte;
  });

  useEffect(() => {
    // Sin nada que encuadrar (un hoyo sin muestras), se parte del campo
    const { centro: deInicio } = datos.current;
    const inicio = deInicio ? { center: lngLat(deInicio), zoom: 16 } : { center: [-3.7, 40.4], zoom: 5 };
    const mapa = new MapaDeMapLibre({ container: contenedor.current, style: ESTILO, attributionControl: false, ...inicio });
    mapaRef.current = mapa;
    mapa.on('load', () => {
      // Antes que lo demás: justo encima de la PNOA, debajo de las líneas
      ponerOrtofoto(mapa, comunidadAhora.current);
      const { muestras: todas, guardada: lo, linea: actual } = datos.current;
      mapa.addSource('muestras', { type: 'geojson', data: deLasMuestras(todas) });
      mapa.addLayer({ id: 'muestras-lineas', type: 'line', source: 'muestras', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': COLOR_DE_LAS_MUESTRAS, 'line-width': 2, 'line-opacity': 0.6 } });
      mapa.addLayer({ id: 'muestras-greens', type: 'circle', source: 'muestras', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 6, 'circle-color': COLOR_DE_LAS_MUESTRAS, 'circle-opacity': 0.6, 'circle-stroke-color': '#000', 'circle-stroke-width': 1 } });
      mapa.addLayer({ id: CAPAS_DE_TOQUE[0], type: 'line', source: 'muestras', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': COLOR_DE_LAS_MUESTRAS, 'line-width': 22, 'line-opacity': 0 } });
      mapa.addLayer({ id: CAPAS_DE_TOQUE[1], type: 'circle', source: 'muestras', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 11, 'circle-color': COLOR_DE_LAS_MUESTRAS, 'circle-opacity': 0 } });
      mapa.addSource('osm', { type: 'geojson', data: comoLineaDeOsm(datos.current.osm) });
      mapa.addLayer({ id: 'osm', type: 'line', source: 'osm', paint: { 'line-color': COLOR_DE_OSM, 'line-width': 3, 'line-dasharray': [1, 1] } });
      mapa.addSource('guardada', { type: 'geojson', data: coleccion(comoLinea(lo)) });
      mapa.addLayer({ id: 'guardada', type: 'line', source: 'guardada', paint: { 'line-color': COLOR_DE_LO_GUARDADO, 'line-width': 3, 'line-dasharray': [2, 2] } });
      mapa.addSource('linea', { type: 'geojson', data: coleccion(comoLinea(actual)) });
      mapa.addLayer({ id: 'linea', type: 'line', source: 'linea', paint: { 'line-color': COLOR_DE_LA_LINEA, 'line-width': 4 } });
      // Lo ya tocado al marcar desde cero (la salida, mientras se toca el green)
      mapa.addSource('marcados', { type: 'geojson', data: comoPuntos(datos.current.marcados) });
      mapa.addSource('yo', { type: 'geojson', data: comoPuntos(datos.current.posicion ? [datos.current.posicion] : []) });
      mapa.addLayer({ id: 'yo', type: 'circle', source: 'yo', paint: { 'circle-radius': 7, 'circle-color': '#2563eb', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
      mapa.addLayer({ id: 'marcados', type: 'circle', source: 'marcados', paint: { 'circle-radius': 8, 'circle-color': COLOR_DE_LA_LINEA, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
      // El green suelto seleccionado, encima de todo: ninguna línea lo tapa (S6b)
      mapa.addSource('destacado', { type: 'geojson', data: comoPuntos(datos.current.destacado ? [datos.current.destacado] : []) });
      mapa.addLayer({ id: 'destacado', type: 'circle', source: 'destacado', paint: { 'circle-radius': 8, 'circle-color': COLOR_DE_LA_LINEA, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
      cargado.current = true;
      // Con la línea roja, orientado con ella (A1); sin ella, todo y norte arriba
      if (datos.current.orientar > 0 && actual) orientarAhora.current(false);
      else verTodo.current();
      pintar.current();
      // La posición pudo llegar antes de que cargara
      centrar.current();
    });
    // Marcando, el toque es para marcar (M8); si no, elige la muestra o el
    // reporte que haya debajo: el primero de la lista (M4)
    mapa.on('click', (e) => {
      const { onToque: marcar, onElegir: elegir } = datos.current;
      if (marcar) {
        marcar({ lat: e.lngLat.lat, lon: e.lngLat.lng });
        return;
      }
      if (!elegir) return;
      // Un toque en un punto de la roja (sin llegar a arrastrarlo) no es elegir otra (CodeRabbit)
      if (e.originalEvent?.target?.closest?.('.maplibregl-marker')) return;
      const debajo = mapa.queryRenderedFeatures(e.point, { layers: CAPAS_DE_TOQUE });
      if (!debajo.length) return;
      const primera = debajo.reduce((a, b) => (b.properties.orden < a.properties.orden ? b : a));
      elegir(primera.properties.id);
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
    mapa.getSource('osm')?.setData(comoLineaDeOsm(osm));
  }, [muestras, guardada, osm]);

  useEffect(() => pintar.current(), [linea]);

  useEffect(() => orientarAhora.current(true), [orientar]);

  useEffect(() => {
    if (cargado.current) mapaRef.current?.getSource('destacado')?.setData(comoPuntos(destacado ? [destacado] : []));
  }, [destacado]);

  useEffect(() => {
    if (cargado.current) mapaRef.current?.getSource('marcados')?.setData(comoPuntos(marcados));
  }, [marcados]);

  useEffect(() => {
    comunidadAhora.current = comunidad;
    if (cargado.current && mapaRef.current) ponerOrtofoto(mapaRef.current, comunidad);
  }, [comunidad]);

  useEffect(() => centrar.current(), [posicion, centrarEnMi]);

  useEffect(() => {
    for (const m of puntos.current) m.setDraggable(!bloqueada);
  }, [bloqueada]);

  // Quién firma la imagen, como en el mapa del jugador: sus licencias lo piden (/code-review)
  const atribucion = atribucionDeLaOrtofoto(comunidad);
  return (
    <>
      <div ref={contenedor} className="absolute inset-0" />
      <p data-testid="atribucion-del-mapa" className="pointer-events-none absolute bottom-1 left-2 z-10 text-[10px] text-white/80 [text-shadow:0_1px_2px_#000]">
        {tMapa('mapa.atribucionPnoa')}
        {atribucion && ` · ${tMapa(atribucion)}`}
      </p>
    </>
  );
};

export default MapaDeRevision;
