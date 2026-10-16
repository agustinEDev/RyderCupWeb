/**
 * La geometría que necesita el mapa del hoyo (BE #532): hacia dónde mira el
 * hoyo, qué hay que encuadrar y si una posición del GPS se puede usar.
 *
 * Los puntos son `{ lat, lon }`; los límites, en el orden de los mapas
 * (`[[oeste, sur], [este, norte]]`, longitud primero).
 */

export const radianes = (grados) => (grados * Math.PI) / 180;
const grados = (rad) => (rad * 180) / Math.PI;

/** El rumbo inicial de `a` a `b`, en grados desde el norte (0–360). */
export const rumbo = (a, b) => {
  const lat1 = radianes(a.lat);
  const lat2 = radianes(b.lat);
  const dLon = radianes(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (grados(Math.atan2(y, x)) + 360) % 360;
};

/**
 * El giro del mapa para ver el hoyo como se juega: de la salida al centro del
 * green (o, sin green, al final de la línea de juego). `null` si no se sabe:
 * entonces el norte va arriba.
 */
export const orientacionDelHoyo = (hoyo) => {
  const linea = hoyo?.playLine ?? [];
  if (linea.length === 0) return null;
  const destino = hoyo.green?.center ?? (linea.length > 1 ? linea.at(-1) : null);
  if (!destino) return null;
  return rumbo(linea[0], destino);
};

/** Los puntos que forman el hoyo: su línea de juego y su green (delante, centro y fondo). */
const puntosDelHoyo = (hoyo) => {
  const green = hoyo?.green;
  return [...(hoyo?.playLine ?? []), ...(green ? [green.front, green.center, green.back] : [])];
};

/** Lo que hay que encuadrar para ver el hoyo entero, o `null` sin puntos. */
export const limitesDelHoyo = (hoyo) => {
  const puntos = puntosDelHoyo(hoyo);
  if (puntos.length === 0) return null;
  const lats = puntos.map((p) => p.lat);
  const lons = puntos.map((p) => p.lon);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
};

// Web Mercator, como el mapa: el radio de su esfera y el lado de sus teselas
const RADIO_MERCATOR_M = 6378137;
const TESELA_PX = 512;
const ZOOM_MAXIMO = 19;

/**
 * El centro y el zoom del mapa para ver el hoyo entero, girado a `rumboGrados`,
 * lo más grande que quepa en el hueco libre (la pantalla menos `padding`) y en
 * medio de él. `fitBounds` no vale con el mapa girado: encuadra la caja
 * norte-sur del hoyo, que girada ocupa mucho más que él (en diagonal, casi el
 * doble). El centro que devuelve es el del MAPA (ya desplazado para que el hoyo
 * quede en medio del hueco): así no hay que darle el `padding` a MapLibre, que
 * lo guardaría y lo sumaría después a todo (medir, «Céntrame»). Sin hueco libre,
 * la pantalla entera. `null` sin puntos.
 *
 * @param {{playLine: Object[], green: Object|null}|null} hoyo
 * @param {number} rumboGrados
 * @param {{ancho: number, alto: number, padding: {top, bottom, left, right}}} pantalla
 * @returns {{center: {lat: number, lon: number}, zoom: number}|null}
 */
export const encuadreGirado = (hoyo, rumboGrados, { ancho, alto, padding }) => {
  // Sin puntos imposibles (NaN): `jumpTo` no admite un centro así
  const puntos = puntosDelHoyo(hoyo).filter((p) => esPosicionValida(p));
  if (puntos.length === 0) return null;
  const origen = puntos[0];
  const coseno = Math.cos(radianes(origen.lat));
  const r = radianes(rumboGrados);
  // En metros desde el primer punto: a lo largo del hoyo (u, hacia arriba en la
  // pantalla) y de lado (v, hacia la derecha)
  const giradas = puntos.map((p) => {
    const este = radianes(p.lon - origen.lon) * RADIO_MERCATOR_M * coseno;
    const norte = radianes(p.lat - origen.lat) * RADIO_MERCATOR_M;
    return { u: este * Math.sin(r) + norte * Math.cos(r), v: este * Math.cos(r) - norte * Math.sin(r) };
  });
  const us = giradas.map((g) => g.u);
  const vs = giradas.map((g) => g.v);
  const [uMin, uMax, vMin, vMax] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  const hayHueco = alto - padding.top - padding.bottom > 0 && ancho - padding.left - padding.right > 0;
  const margen = hayHueco ? padding : { top: 0, bottom: 0, left: 0, right: 0 };
  const libreAlto = alto - margen.top - margen.bottom;
  const libreAncho = ancho - margen.left - margen.right;
  const ajustado = Math.max((uMax - uMin) / libreAlto, (vMax - vMin) / libreAncho);
  const zoom = ajustado > 0 ? Math.min(ZOOM_MAXIMO, Math.log2((2 * Math.PI * RADIO_MERCATOR_M * coseno) / (TESELA_PX * ajustado))) : ZOOM_MAXIMO;
  const mPorPx = (2 * Math.PI * RADIO_MERCATOR_M * coseno) / (TESELA_PX * 2 ** zoom);
  // El centro de la pantalla, desde el centro del hueco: el hoyo queda en medio del hueco
  const u = (uMin + uMax) / 2 + ((margen.top - margen.bottom) / 2) * mPorPx;
  const v = (vMin + vMax) / 2 + ((margen.right - margen.left) / 2) * mPorPx;
  const center = {
    lat: origen.lat + (u * Math.cos(r) - v * Math.sin(r)) / RADIO_MERCATOR_M / (Math.PI / 180),
    lon: origen.lon + (u * Math.sin(r) + v * Math.cos(r)) / (RADIO_MERCATOR_M * coseno) / (Math.PI / 180),
  };
  return { center, zoom };
};

/** Una posición con coordenadas de verdad: hay GPS y extensiones que dan NaN. */
export const esPosicionValida = (posicion) =>
  Number.isFinite(posicion?.lat) &&
  Number.isFinite(posicion?.lon) &&
  Math.abs(posicion.lat) <= 90 &&
  Math.abs(posicion.lon) <= 180;
