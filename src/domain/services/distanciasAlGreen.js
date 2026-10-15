/**
 * Distancias en el campo (mapa de hoyos, BE #532).
 *
 * Sobre la esfera (haversine): en un hoyo de golf, de pocos cientos de metros,
 * la diferencia con el elipsoide es de centímetros. Aquí y no en el backend
 * porque el jugador las necesita sin cobertura, con su GPS.
 */

const RADIO_TERRESTRE_M = 6371008.8;

const radianes = (grados) => (grados * Math.PI) / 180;

/**
 * Metros enteros entre dos puntos `{ lat, lon }`.
 */
export const distanciaEnMetros = (a, b) => {
  const dLat = radianes(b.lat - a.lat);
  const dLon = radianes(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radianes(a.lat)) * Math.cos(radianes(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * RADIO_TERRESTRE_M * Math.asin(Math.min(1, Math.sqrt(h))));
};

/**
 * Delante, centro y fondo del green desde donde está el jugador, o `null` si
 * falta su posición o el hoyo no tiene green.
 */
export const distanciasAlGreen = (posicion, green) => {
  if (!posicion || !green) return null;
  return {
    front: distanciaEnMetros(posicion, green.front),
    center: distanciaEnMetros(posicion, green.center),
    back: distanciaEnMetros(posicion, green.back),
  };
};
