/**
 * El zoom al green en los últimos metros (Agustín, 19 nov): con el GPS bueno y
 * cerca del green, el mapa se gira contigo abajo y el green arriba, lo más
 * grande que quepa con los dos a la vista. Una vez por apertura del mapa.
 *
 * El zoom no pasa de 19 (`camaraGirada`): es el máximo de la ortofoto de la
 * comunidad, la menor de las dos capas (la PNOA llega a 20).
 */

import { distanciaEnMetros } from './distanciasAlGreen';
import { rumbo } from './geometriaDelHoyo';

/** A esta distancia del centro del green, o menos, el mapa se acerca. */
export const ZOOM_AL_GREEN_M = 100;

/**
 * Si toca acercarse al green ahora. No: si ya se acercó en esta apertura, lejos
 * del campo, sin GPS bueno, sin green, marcando el hoyo, con un punto medido o
 * con un reporte (o el «⋮») abierto; esos tres últimos, solo mientras duren.
 *
 * @param {{
 *   posicionBuena: {lat: number, lon: number}|null,
 *   green: {center?: {lat: number, lon: number}|null}|null,
 *   lejos: boolean,
 *   yaAcercado: boolean,
 *   marcando: boolean,
 *   medido: Object|null,
 *   reporte: Object|null,
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
}) =>
  !yaAcercado &&
  !lejos &&
  !marcando &&
  !medido &&
  !reporte &&
  Boolean(posicionBuena && green?.center) &&
  distanciaEnMetros(posicionBuena, green.center) <= ZOOM_AL_GREEN_M;

/**
 * Lo que se encuadra al acercarse: tú y el green (delante, centro y fondo; el
 * modelo aún no tiene contorno), girado de ti al centro del green.
 *
 * @param {{lat: number, lon: number}} desde
 * @param {{center: {lat: number, lon: number}}} green
 * @returns {{hoyo: {playLine: Object[], green: Object}, rumbo: number}}
 */
export const encuadreAlGreen = (desde, green) => ({
  hoyo: { playLine: [desde], green },
  rumbo: rumbo(desde, green.center),
});

/**
 * La vista que se queda cuando llega otra: la orientación desde ti (a mitad de
 * hoyo) no pisa el zoom al green; todo lo demás, sí (Z14).
 *
 * @param {{tipo: string}|null} actual
 * @param {{tipo: string}} nueva
 * @returns {{tipo: string}}
 */
export const vistaQueGana = (actual, nueva) =>
  actual?.tipo === 'alGreen' && nueva.tipo === 'desdeMi' ? actual : nueva;
