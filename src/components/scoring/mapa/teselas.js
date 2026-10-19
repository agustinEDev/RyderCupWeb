import { limitesDeLaComunidad } from '../../../domain/services/comunidadDelCampo';
import { captureError } from '../../../utils/sentryHelpers';

// Ortofoto del PNOA (IGN), la de más detalle de España; sus teselas permiten
// CORS. La usan el mapa del hoyo y el de revisar hoyos del admin (BE #575)
export const TESELAS_PNOA =
  'https://www.ign.es/wmts/pnoa-ma?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=OI.OrthoimageCoverage' +
  '&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/jpeg';

// Una WMS en 3857 por la caja de cada tesela, como si fuera una de teselas.
// Fuera de su comunidad, la tesela tiene que llegar transparente: en JPEG llega
// en blanco y tapa la PNOA de debajo (revisor)
const wms = (base, capa, formato) =>
  `${base}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${capa}&STYLES=&FORMAT=${formato}&TRANSPARENT=TRUE` +
  '&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256';

/**
 * Las ortofotos de comunidad más recientes que la PNOA (19 oct 2026, todas de
 * 2025 y 25 cm, con CORS y licencia que deja guardarlas): por código ISO de la
 * comunidad, sus teselas. Quién la firma, en `mapa.ortofoto.<código>`. Castilla
 * y León, cuando se aclare su licencia.
 */
export const ORTOFOTOS = {
  // La vigente del ICGC (2025) en su mixto, como Navarra: su XYZ era JPEG y
  // fuera de Cataluña rellenaba con otra imagen (CodeRabbit)
  'ES-CT': {
    tiles: [wms('https://geoserveis.icgc.cat/servei/catalunya/orto-territorial/wms', 'ortofoto_color_vigent', 'image/vnd.jpeg-png')],
  },
  // La caché de ArcGIS va con la fila antes que la columna
  'ES-PV': {
    tiles: ['https://www.geo.euskadi.eus/geoeuskadi/rest/services/U11/WMTS_ORTO/MapServer/tile/{z}/{y}/{x}'],
  },
  // El mixto de IDENA: JPEG dentro (14 KB), PNG transparente fuera; en PNG
  // pesaba ocho veces más
  'ES-NC': {
    tiles: [wms('https://idena.navarra.es/ogc/ows', 'ortofoto_maxima_actualidad', 'image/vnd.jpeg-png')],
  },
  // WebP: transparente fuera y, dentro, la mitad que el JPEG (que fuera llega en blanco)
  'ES-MD': {
    tiles: [
      'https://idem.comunidad.madrid/srvimagenes2/ogc/wmts/visorcartografia2?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
        '&LAYER=fotosAereas_2025-CT-25cm-ov-mos-rgb&STYLE=default&FORMAT=image/webp&TILEMATRIXSET=EPSG3857' +
        '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
    ],
  },
};

const CAPA = 'ortofoto';

/** La clave de quién firma la ortofoto de la comunidad (su licencia lo pide), o null. */
export const atribucionDeLaOrtofoto = (codigo) => (codigo && ORTOFOTOS[codigo] ? `mapa.ortofoto.${codigo}` : null);

// La que tiene puesta cada mapa: MapLibre rellena las teselas de la fuente un
// fotograma después, así que compararlas rehacía la recién puesta (/code-review)
const puestas = new WeakMap();

/**
 * Pone encima de la PNOA la ortofoto de la comunidad (o la quita, sin ella). La
 * PNOA sigue debajo: mientras carga, si falla y fuera de su caja, se ve esa. Si
 * MapLibre falla al ponerla, se apunta y el mapa sigue con la PNOA y lo demás.
 */
export const ponerOrtofoto = (mapa, codigo) => {
  const ortofoto = codigo ? ORTOFOTOS[codigo] : null;
  if (ortofoto && puestas.get(mapa) === codigo && mapa.getSource(CAPA)) return;
  try {
    if (mapa.getLayer(CAPA)) mapa.removeLayer(CAPA);
    if (mapa.getSource(CAPA)) mapa.removeSource(CAPA);
    if (!ortofoto) return;
    mapa.addSource(CAPA, { type: 'raster', tiles: ortofoto.tiles, tileSize: 256, maxzoom: 19, bounds: limitesDeLaComunidad(codigo) });
    const capas = mapa.getStyle().layers.map((c) => c.id);
    mapa.addLayer({ id: CAPA, type: 'raster', source: CAPA }, capas[capas.indexOf('pnoa') + 1]);
    puestas.set(mapa, codigo);
  } catch (error) {
    captureError(error, { tags: { modulo: 'mapa-de-hoyos' } });
  }
};
