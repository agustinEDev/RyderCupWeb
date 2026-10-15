/**
 * La geometría que necesita el mapa del hoyo (BE #532): hacia dónde mira el
 * hoyo, qué hay que encuadrar y si una posición del GPS se puede usar.
 *
 * Los puntos son `{ lat, lon }`; los límites, en el orden de los mapas
 * (`[[oeste, sur], [este, norte]]`, longitud primero).
 */

const radianes = (grados) => (grados * Math.PI) / 180;
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

/** Lo que hay que encuadrar para ver el hoyo entero, o `null` sin puntos. */
export const limitesDelHoyo = (hoyo) => {
  const green = hoyo?.green;
  const puntos = [...(hoyo?.playLine ?? []), ...(green ? [green.front, green.center, green.back] : [])];
  if (puntos.length === 0) return null;
  const lats = puntos.map((p) => p.lat);
  const lons = puntos.map((p) => p.lon);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
};

/** Una posición con coordenadas de verdad: hay GPS y extensiones que dan NaN. */
export const esPosicionValida = (posicion) =>
  Number.isFinite(posicion?.lat) &&
  Number.isFinite(posicion?.lon) &&
  Math.abs(posicion.lat) <= 90 &&
  Math.abs(posicion.lon) <= 180;
