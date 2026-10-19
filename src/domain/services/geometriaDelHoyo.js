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

// El radio de la Tierra de las distancias del campo, y lo que yerra un GPS bueno
const RADIO_TERRESTRE_M = 6371008.8;
const CERCA_DEL_PUNTO_M = 20;

/**
 * El giro del mapa para una línea de la salida al green (Agustín, 17 oct): en
 * un par 4 o 5, de la salida al primer codo (lo que se ve desde la salida); en
 * un par 3, sin codos o sin par, de la salida al green. `null` sin línea.
 */
export const rumboDeLaLinea = (linea, par) => {
  if (!linea || linea.length < 2) return null;
  const hacia = par === 4 || par === 5 ? linea[1] : linea.at(-1);
  return rumbo(linea[0], hacia);
};

/**
 * Dónde cae `p` en el tramo de `a` a `b`: `t` (0 en `a`, 1 en `b`) y a cuántos
 * metros queda de él. En un plano local, que para un hoyo basta; un tramo de
 * largo cero es su punto.
 */
export const proyeccionEnElTramo = (p, a, b) => {
  const coseno = Math.cos(radianes(a.lat));
  const xy = (q) => [radianes(q.lon - a.lon) * RADIO_TERRESTRE_M * coseno, radianes(q.lat - a.lat) * RADIO_TERRESTRE_M];
  const [px, py] = xy(p);
  const [bx, by] = xy(b);
  const largo2 = bx * bx + by * by;
  const t = largo2 > 0 ? Math.min(1, Math.max(0, (px * bx + py * by) / largo2)) : 0;
  return { t, metros: Math.hypot(px - t * bx, py - t * by) };
};

/**
 * A mitad de hoyo, el siguiente punto de la línea que hay delante (Agustín,
 * 18 oct): el final del tramo más cercano a `posicion` (el siguiente codo o el
 * green). Si lo más cerca del tramo es su final, ese punto ya quedó atrás (por
 * fuera de la esquina de un dogleg); y a menos de lo que yerra el GPS de un
 * punto, tampoco es «delante»: en los dos casos, el siguiente (revisor,
 * 18 oct). `null` sin línea.
 */
export const siguientePuntoDeLaLinea = (posicion, linea) => {
  if (!linea || linea.length < 2) return null;
  let mejor = null;
  for (let i = 0; i < linea.length - 1; i += 1) {
    const { t, metros } = proyeccionEnElTramo(posicion, linea[i], linea[i + 1]);
    if (!mejor || metros < mejor.metros) mejor = { metros, i: t === 1 ? i + 2 : i + 1 };
  }
  let i = Math.min(mejor.i, linea.length - 1);
  while (i < linea.length - 1 && proyeccionEnElTramo(posicion, linea[i], linea[i]).metros < CERCA_DEL_PUNTO_M) i += 1;
  return linea[i];
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

/**
 * La cámara de un encuadre girado: el centro, el zoom y el rumbo, para el mapa
 * del jugador y el de revisar (/code-review, 18 oct). `null` sin rumbo o sin
 * puntos: entonces no se mueve.
 */
export const camaraGirada = (hoyo, rumboGrados, pantalla) => {
  if (rumboGrados === null) return null;
  const encuadre = encuadreGirado(hoyo, rumboGrados, pantalla);
  return encuadre ? { center: encuadre.center, zoom: encuadre.zoom, bearing: rumboGrados } : null;
};
