/**
 * El zoom al green en los últimos metros (Agustín, 19 nov): con el GPS bueno y
 * cerca del green, el mapa encuadra a ti y al green, lo más grandes que quepan.
 * Una vez por apertura del mapa, y otra tras cada marca.
 *
 * El zoom no pasa de 19 (`camaraGirada`): es el máximo de la ortofoto de la
 * comunidad, la menor de las dos capas (la PNOA llega a 20).
 */

import { distanciaEnMetros } from './distanciasAlGreen';
import {
  FUERA_DE_LA_SALIDA_M,
  proyeccionEnElTramo,
  rumbo,
  rumboDeLaLinea,
} from './geometriaDelHoyo';

/** A esta distancia del centro del green, o menos, el mapa se acerca. */
export const ZOOM_AL_GREEN_M = 100;
/** Más cerca que esto del centro, el giro de ti al green bailaría: el del hoyo. */
export const GIRO_DEL_HOYO_M = 30;

/**
 * Si toca acercarse al green ahora. No: si ya se acercó, lejos del campo, sin
 * GPS bueno, sin green, en la salida (un hoyo corto se ve entero), marcando el
 * hoyo, con un punto medido o con un reporte (o el «⋮») abierto; los tres
 * últimos, solo mientras duren.
 *
 * @param {{
 *   posicionBuena: {lat: number, lon: number}|null,
 *   green: {center?: {lat: number, lon: number}|null}|null,
 *   lejos: boolean,
 *   yaAcercado: boolean,
 *   marcando: boolean,
 *   medido: Object|null,
 *   reporte: Object|null,
 *   salida: {lat: number, lon: number}|null,
 * }} estado
 * @returns {boolean}
 */
export const tocaAcercarseAlGreen = ({
  posicionBuena,
  green,
  lejos,
  yaAcercado,
  marcando,
  medido,
  reporte,
  salida,
}) =>
  !yaAcercado &&
  !lejos &&
  !marcando &&
  !medido &&
  !reporte &&
  Boolean(posicionBuena && green?.center) &&
  distanciaEnMetros(posicionBuena, green.center) <= ZOOM_AL_GREEN_M &&
  !(salida && distanciaEnMetros(posicionBuena, salida) <= FUERA_DE_LA_SALIDA_M);

const mismoPunto = (a, b) => a.lat === b.lat && a.lon === b.lon;

/**
 * El giro del zoom al green. Lejos, de ti al centro del green (tú abajo, el
 * green arriba). A menos de 30 m o pasado el green (más allá de su centro en la
 * dirección del último tramo), el del hoyo, con el que se juega
 * (`rumboDeLaLinea`; sin línea, de la salida al green). Sin salida, siempre de
 * ti al green.
 *
 * @param {{desde: Object, green: {center: Object}, linea: Object[]|null, par: number|null}} datos
 * @returns {number}
 */
export const giroAlGreen = ({ desde, green, linea, par }) => {
  const centro = green.center;
  const salida = linea?.[0] ?? null;
  if (!salida) return rumbo(desde, centro);
  const delHoyo = rumboDeLaLinea(linea, par) ?? rumbo(salida, centro);
  // El último tramo acaba en el green: empieza en el último punto que no es él
  const antes = linea.filter((p) => !mismoPunto(p, centro)).at(-1) ?? salida;
  const pasado = proyeccionEnElTramo(desde, antes, centro).t === 1;
  return pasado || distanciaEnMetros(desde, centro) < GIRO_DEL_HOYO_M
    ? delHoyo
    : rumbo(desde, centro);
};

/**
 * Lo que se encuadra al acercarse: tú y el green (delante, centro y fondo; el
 * modelo aún no tiene contorno), con su giro (`giroAlGreen`).
 *
 * @param {{desde: Object, green: Object, linea: Object[]|null, par: number|null}} datos
 * @returns {{hoyo: {playLine: Object[], green: Object}, rumbo: number}}
 */
export const encuadreAlGreen = ({ desde, green, linea, par }) => ({
  hoyo: { playLine: [desde], green },
  rumbo: giroAlGreen({ desde, green, linea, par }),
});
