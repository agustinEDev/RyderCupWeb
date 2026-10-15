/**
 * Un hoyo marcado por el jugador (BE #532, PR C).
 *
 * En un hoyo sin datos se marcan la salida y el centro del green (y, en un
 * dogleg, hasta dos codos); si el hoyo ya tiene salida, solo el green. De ahí
 * sale un hoyo como los del mapa: su línea de juego y su green, con delante y
 * fondo a 10 m del centro sobre el último tramo, hasta que haya contorno.
 *
 * Las reglas son las aprobadas el 15 oct; el límite de 40-750 m lo aplica
 * también el servidor, y aquí solo sirve para avisar antes de enviar.
 */

import { distanciaEnMetros } from './distanciasAlGreen';
import { radianes, rumbo } from './geometriaDelHoyo';

export const METROS_AL_BORDE_DEL_GREEN = 10;
export const MAX_CODOS = 2;
export const MARGEN_DE_LA_TARJETA = 0.25;
export const MIN_SALIDA_GREEN_M = 40;
export const MAX_SALIDA_GREEN_M = 750;

const RADIO_TERRESTRE_M = 6371008.8; // el de distanciaEnMetros
const grados = (rad) => (rad * 180) / Math.PI;

/** El punto a `metros` de `origen` con ese rumbo (grados desde el norte). */
export const puntoDesde = (origen, rumboEnGrados, metros) => {
  const d = metros / RADIO_TERRESTRE_M;
  const r = radianes(rumboEnGrados);
  const lat1 = radianes(origen.lat);
  const lon1 = radianes(origen.lon);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(r));
  const lon2 = lon1 + Math.atan2(Math.sin(r) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: grados(lat2), lon: grados(lon2) };
};

const greenAlFinalDe = (linea) => {
  const center = linea.at(-1);
  const anterior = linea.at(-2);
  return {
    front: puntoDesde(center, rumbo(center, anterior), METROS_AL_BORDE_DEL_GREEN),
    center,
    back: puntoDesde(center, rumbo(anterior, center), METROS_AL_BORDE_DEL_GREEN),
  };
};

/**
 * El hoyo que sale de una marca. Si la marca es solo del green, la línea es la
 * aprobada (con sus codos) terminada en el green marcado.
 *
 * @param {{tee: Object|null, bends: Object[], greenCenter: Object}|null} marca
 * @param {{playLine: Object[]}|null} [aprobado] el hoyo del mapa, con su salida
 */
export const hoyoDeUnaMarca = (marca, aprobado = null) => {
  if (!marca) return null;
  let playLine;
  if (marca.tee) {
    playLine = [marca.tee, ...marca.bends, marca.greenCenter];
  } else {
    const base = aprobado?.playLine ?? [];
    if (base.length === 0) return null;
    playLine = [...base.slice(0, Math.max(1, base.length - 1)), marca.greenCenter];
  }
  return { playLine, green: greenAlFinalDe(playLine), marcadoPorMi: true };
};

/** Lo que mide la línea siguiendo sus codos, en metros. */
export const longitudDeLaLinea = (linea) =>
  linea.slice(1).reduce((total, punto, i) => total + distanciaEnMetros(linea[i], punto), 0);

/** Si lo marcado se aparta de los metros de la tarjeta más de un 25 %. */
export const difiereDeLaTarjeta = (metrosMarcados, metrosDeLaTarjeta) =>
  Boolean(metrosDeLaTarjeta) && Math.abs(metrosMarcados - metrosDeLaTarjeta) > MARGEN_DE_LA_TARJETA * metrosDeLaTarjeta;

/** 'cerca' o 'lejos' si la recta de la salida al green se sale de 40-750 m; si no, null. */
export const salidaGreenFueraDeLimites = (salida, green) => {
  const metros = distanciaEnMetros(salida, green);
  if (metros < MIN_SALIDA_GREEN_M) return 'cerca';
  if (metros > MAX_SALIDA_GREEN_M) return 'lejos';
  return null;
};

/**
 * Los puntos que se arrastran para formar un codo: uno en mitad de cada tramo,
 * con la posición en la que entraría en la línea. Con dos codos, ninguno más.
 */
export const puntosParaArrastrar = (linea) => {
  if (linea.length - 2 >= MAX_CODOS) return [];
  return linea.slice(1).map((punto, i) => {
    const desde = linea[i];
    return { indice: i + 1, punto: puntoDesde(desde, rumbo(desde, punto), distanciaEnMetros(desde, punto) / 2) };
  });
};

/** Un anillo cerrado de puntos a `metros` de `centro` (el arco de la tarjeta). */
export const circuloAlrededor = (centro, metros, lados = 64) => {
  const anillo = Array.from({ length: lados }, (_, i) => puntoDesde(centro, (360 / lados) * i, metros));
  return [...anillo, anillo[0]];
};
