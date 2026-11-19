/**
 * El zoom al green en los últimos metros (Agustín, 19 nov): con el GPS bueno y
 * cerca del green, el mapa encuadra a ti y al green, lo más grandes que quepan.
 * Una vez por apertura del mapa, y otra tras cada marca.
 *
 * El zoom no pasa de 19 (`camaraGirada`): es el máximo de la ortofoto de la
 * comunidad, la menor de las dos capas (la PNOA llega a 20).
 */

import { distanciaEnMetros, distanciaExacta } from './distanciasAlGreen';
import {
  FUERA_DE_LA_SALIDA_M,
  rumbo,
  rumboDeLaLinea,
} from './geometriaDelHoyo';

/** A esta distancia del centro del green, o menos, el mapa se acerca. */
export const ZOOM_AL_GREEN_M = 100;
/** Más cerca que esto del centro no hay rumbo de ti al green fiable: el del hoyo. */
export const SIN_RUMBO_M = 1;

// En la salida de tu barra, la misma con la que el mapa vuelve al hoyo entero
// al llegar a ella (H12); sin barra, la de la línea
const enLaSalida = (posicion, salida) =>
  Boolean(salida) &&
  distanciaEnMetros(posicion, salida) <= FUERA_DE_LA_SALIDA_M;

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
 *   salidaDeMiBarra: {lat: number, lon: number}|null,
 *   salidaDeLaLinea: {lat: number, lon: number}|null,
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
  salidaDeMiBarra,
  salidaDeLaLinea,
}) =>
  !yaAcercado &&
  !lejos &&
  !marcando &&
  !medido &&
  !reporte &&
  Boolean(posicionBuena && green?.center) &&
  distanciaEnMetros(posicionBuena, green.center) <= ZOOM_AL_GREEN_M &&
  !enLaSalida(posicionBuena, salidaDeMiBarra ?? salidaDeLaLinea);

/**
 * El giro del zoom al green: siempre de ti al centro del green, tú abajo y el
 * green arriba (Agustín, 19 nov), también encima de él y pasado. Solo en el
 * centro (a menos de `SIN_RUMBO_M`), donde no hay rumbo fiable, el del hoyo:
 * con el que se juega (`rumboDeLaLinea`) o, sin línea, de la salida al green.
 * Sin salida, de ti al green siempre.
 *
 * @param {{desde: Object, green: {center: Object}, linea: Object[]|null, par: number|null}} datos
 * @returns {number}
 */
export const giroAlGreen = ({ desde, green, linea, par }) => {
  const centro = green.center;
  const salida = linea?.[0] ?? null;
  if (!salida || distanciaExacta(desde, centro) >= SIN_RUMBO_M)
    return rumbo(desde, centro);
  return rumboDeLaLinea(linea, par) ?? rumbo(salida, centro);
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
