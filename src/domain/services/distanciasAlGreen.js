/**
 * La distancia entre dos puntos del campo (mapa de hoyos, BE #532).
 *
 * Sobre la esfera (haversine): en un hoyo de golf, de pocos cientos de metros,
 * la diferencia con el elipsoide es de centímetros. Aquí y no en el backend
 * porque el jugador las necesita sin cobertura, con su GPS.
 */

import { radianes } from './geometriaDelHoyo';

const RADIO_TERRESTRE_M = 6371008.8;

/**
 * Metros entre dos puntos `{ lat, lon }`, sin redondear: para sumar muchos
 * tramos cortos (una línea de OSM) sin que cada uno se quede en 0.
 */
export const distanciaExacta = (a, b) => {
  const dLat = radianes(b.lat - a.lat);
  const dLon = radianes(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radianes(a.lat)) * Math.cos(radianes(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TERRESTRE_M * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * Metros enteros entre dos puntos `{ lat, lon }`: lo que se enseña.
 */
export const distanciaEnMetros = (a, b) => Math.round(distanciaExacta(a, b));
