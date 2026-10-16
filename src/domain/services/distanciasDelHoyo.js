/**
 * El recuadro de delante, centro y fondo del mapa del hoyo (BE #532).
 *
 * Fijo, desde la salida, con los metros oficiales de la tarjeta (Agustín, 16
 * oct): no mira dónde está el jugador. Delante y fondo, la tarjeta menos y más
 * lo que hay del centro del green a su borde (sin green dibujado, 10 m). Si la
 * tarjeta no tiene metros, se miden en el mapa desde la salida siguiendo los
 * codos, como la medida oficial.
 */

import { distanciaEnMetros } from './distanciasAlGreen';
import { METROS_AL_BORDE_DEL_GREEN, longitudDeLaLinea } from './hoyoMarcado';

/**
 * @param {{metros: number|null|undefined, hoyo: {playLine: Object[], green: Object|null}|null}} datos
 * @returns {{front: number, center: number, back: number}|null}
 */
export const distanciasDelHoyo = ({ metros, hoyo }) => {
  const green = hoyo?.green ?? null;
  if (metros) {
    const alBorde = (borde) => (green?.[borde] ? distanciaEnMetros(green.center, green[borde]) : METROS_AL_BORDE_DEL_GREEN);
    return { front: metros - alBorde('front'), center: metros, back: metros + alBorde('back') };
  }
  const linea = hoyo?.playLine ?? [];
  if (!green || linea.length < 2) return null;
  // La línea termina en el centro del green: se cambia ese último punto
  const hasta = (punto) => longitudDeLaLinea([...linea.slice(0, -1), punto]);
  return { front: hasta(green.front), center: hasta(green.center), back: hasta(green.back) };
};
