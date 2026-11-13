import { TESELAS_PNOA } from './teselas';
import { geojsonDelHoyo, lngLat } from './geometriaDelMapa';

// Cómo se crea el mapa del hoyo y qué capas lleva: la ortofoto de fondo y,
// encima, la línea del hoyo, la de medir, la que se mueve y el green

export const ESTILO = {
  version: 8,
  sources: { pnoa: { type: 'raster', tiles: [TESELAS_PNOA], tileSize: 256, maxzoom: 20 } },
  layers: [
    // Sin teselas (sin cobertura), gris: el recuadro y las cifras siguen, que no dependen de ellas
    { id: 'fondo', type: 'background', paint: { 'background-color': '#6b7280' } },
    { id: 'pnoa', type: 'raster', source: 'pnoa' },
  ],
};
export const ESPAÑA = { center: [-3.7, 40.4], zoom: 5 };
export const ZOOM_SIN_MAPA = 17;

// Las opciones del mapa al crearlo en `nodo`. Orientado (un hoyo con mapa), con
// su rumbo y sin girarlo; si no, el norte arriba. Sin `centro`, España entera
export const opcionesDelMapa = (nodo, { orientado, rumbo, centro }) => ({
  container: nodo,
  style: ESTILO,
  attributionControl: false,
  bearing: orientado ? rumbo : 0,
  // Un hoyo con mapa se ve como se juega: sin giro ni inclinación
  dragRotate: !orientado,
  pitchWithRotate: false,
  touchPitch: false,
  // Sin doble toque que acerque: un toque mide en el acto, y se acerca
  // pellizcando (iPhone, 2 nov 2026: con él, acercaba y medía a la vez).
  // Tocar y arrastrar con un dedo sigue acercando (va con el pellizco):
  // mide donde cae el primer toque, aceptado
  doubleClickZoom: false,
  ...(centro ? { center: lngLat(centro), zoom: ZOOM_SIN_MAPA } : ESPAÑA),
});

// Las fuentes y capas del hoyo, al cargar el estilo, con lo que haya entonces:
// el hoyo, la medida y la línea que se mueve. El orden es el de las capas
export const ponerCapasDelHoyo = (mapa, { hoyo, medida, linea }) => {
  mapa.addSource('hoyo', { type: 'geojson', data: geojsonDelHoyo(hoyo) });
  mapa.addLayer({
    id: 'linea-de-juego',
    type: 'line',
    source: 'hoyo',
    filter: ['==', ['get', 'tipo'], 'linea'],
    paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [2, 2] },
  });
  mapa.addSource('medida', { type: 'geojson', data: medida });
  mapa.addLayer({
    id: 'medida-linea',
    type: 'line',
    source: 'medida',
    paint: { 'line-color': '#facc15', 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
  });
  mapa.addSource('marcado', { type: 'geojson', data: linea });
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
};
