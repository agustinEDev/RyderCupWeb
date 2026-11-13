import { distanciaEnMetros } from '../../../domain/services/distanciasAlGreen';
import { MAX_CODOS, estaLejosDelCampo, lineaDeOsm, salidaGreenFueraDeLimites } from '../../../domain/services/hoyoMarcado';

// Los puntos y las líneas del mapa del hoyo, como los pide MapLibre (GeoJSON,
// `[lon, lat]`), y las cuentas de dónde va cada cifra. Sin MapLibre ni React

// Dos toques a menos de esto son un doble toque: marcando, el segundo no cuenta
export const DOBLE_TOQUE_MS = 500;
// A partir de aquí, la línea desde ti sale con un codo en medio (Agustín, 18 oct)
export const CODO_DESDE_M = 200;
// Sin tocar, a la vista no se va hasta bajar de aquí: que el GPS, quieto cerca
// de los 200 m, no lo haga parpadear (Agustín, 20 oct)
export const CODO_HASTA_M = 190;
// Más lejos que esto de la salida de tu barra, estás a mitad de hoyo (Agustín, 18 oct)
export const FUERA_DE_LA_SALIDA_M = 40;

export const lngLat = (p) => [p.lon, p.lat];

export const geojsonDelHoyo = (hoyo) => ({
  type: 'FeatureCollection',
  features: [
    ...(hoyo?.playLine?.length > 1
      ? [{ type: 'Feature', properties: { tipo: 'linea' }, geometry: { type: 'LineString', coordinates: hoyo.playLine.map(lngLat) } }]
      : []),
    ...(hoyo?.green
      ? [{ type: 'Feature', properties: { tipo: 'green' }, geometry: { type: 'Point', coordinates: lngLat(hoyo.green.center) } }]
      : []),
  ],
});

// La línea que se puede mover (16 oct): la que se marca o la del hoyo, con
// sus puntos arrastrables
export const geojsonDeLaLinea = (linea) => ({
  type: 'FeatureCollection',
  features: linea.length > 1 ? [{ type: 'Feature', properties: { tipo: 'linea' }, geometry: { type: 'LineString', coordinates: linea.map(lngLat) } }] : [],
});
export const mismoPunto = (a, b) => Boolean(a && b) && a.lat === b.lat && a.lon === b.lon;
// La línea de un hoyo con salida y green, con los codos de su par para moverlos
// (la regla, en el dominio: `lineaDeOsm`). La línea guardada no cambia, solo
// cómo se ve
export const lineaParaMover = (hoyo, par) => lineaDeOsm(hoyo?.playLine, hoyo?.green?.center, par);
// Lo que se envía al cerrar: una línea que el servidor puede guardar (hasta dos
// codos, el green a 40-750 m y, si se sabe dónde está el campo, nada a más de 3 km)
export const muestraValida = (linea, campo) =>
  linea.length - 2 <= MAX_CODOS &&
  !salidaGreenFueraDeLimites(linea[0], linea.at(-1)) &&
  !linea.some((p) => estaLejosDelCampo(p, campo));
// La muestra de lo que se hizo: una línea que vale, o (17 oct) un green solo que
// no esté lejos del campo. Si no vale, `false` (o lo que no sea una muestra)
export const muestraDeLaEdicion = (ultima, soloGreen, campo) =>
  ultima
    ? muestraValida(ultima, campo) && { tee: ultima[0], bends: ultima.slice(1, -1), greenCenter: ultima.at(-1) }
    : soloGreen && !estaLejosDelCampo(soloGreen, campo) && { tee: null, bends: [], greenCenter: soloGreen };

// Sin estar en la salida, de ti al green: directa, o con el codo si se movió,
// cada tramo con sus metros al lado (Agustín, 16 oct: mejor que un cuadro
// aparte). Sin tocarlo, una sola distancia, de ti al green (Agustín, 20 oct)
export const tramosDesdeMi = (posicion, codoMovido, green) => {
  if (!posicion || !green) return [];
  return codoMovido ? [[posicion, codoMovido], [codoMovido, green.center]] : [[posicion, green.center]];
};
export const geojsonDeLaMedida = (tramos) => ({
  type: 'FeatureCollection',
  features: tramos.map(([a, b]) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [lngLat(a), lngLat(b)] } })),
});
export const enMedio = (a, b) => ({ lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 });
// La cifra de la línea de ti al green, sin el codo movido: a 3/4, hacia el
// green, que en medio tapaba el codo (Agustín, 20 oct)
export const haciaElGreen = (a, b) => ({ lat: a.lat + ((b.lat - a.lat) * 3) / 4, lon: a.lon + ((b.lon - a.lon) * 3) / 4 });
// Los tramos de una línea de juego: de la salida al codo, de codo a codo y al green
export const tramosDeLaLinea = (linea) => linea.slice(1).map((p, i) => [linea[i], p]);
// Qué punto de la línea es cada uno: la salida, un codo o el green
export const tipoDelPunto = (i, linea) => (i === 0 ? 'salida' : i === linea.length - 1 ? 'green' : 'codo');

// Las cifras de la línea, en una frase para quien no ve el mapa: hasta tres
// tramos, cada uno con su clave; más, en lista. Sin tramos, nada
export const fraseDeLaLinea = (linea, t) => {
  const lista = tramosDeLaLinea(linea).map(([p, q]) => distanciaEnMetros(p, q));
  const [a, b, c] = lista;
  const clave = [null, 'mapa.lineaUnTramo', 'mapa.lineaDosTramos', 'mapa.lineaTresTramos'][lista.length] ?? (lista.length ? 'mapa.lineaVariosTramos' : null);
  if (!clave) return null;
  return t(clave, lista.length > 3 ? { lista: lista.join(' · ') } : { a, b, c });
};
