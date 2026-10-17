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
  // Sin green no hay recuadro, aunque la tarjeta traiga metros (B4, 17 oct)
  if (!green?.center) return null;
  if (metros) {
    const alBorde = (borde) => (green?.[borde] ? distanciaEnMetros(green.center, green[borde]) : METROS_AL_BORDE_DEL_GREEN);
    // Delante nunca por debajo de 0: con pocos metros en la tarjeta, o un green raro
    return { front: Math.max(0, metros - alBorde('front')), center: metros, back: metros + alBorde('back') };
  }
  const linea = hoyo?.playLine ?? [];
  if (!green || linea.length < 2) return null;
  // La línea termina en el centro del green: se cambia ese último punto
  const hasta = (punto) => longitudDeLaLinea([...linea.slice(0, -1), punto]);
  return { front: hasta(green.front), center: hasta(green.center), back: hasta(green.back) };
};

// Más lejos que esto no estás jugando este hoyo (el mismo límite que una muestra)
const MAX_AL_GREEN_M = 750;
// Peor que esto, la posición no sirve para medir el hoyo (Agustín, 17 oct)
export const PRECISION_PARA_MEDIR_M = 20;

/**
 * El recuadro desde donde está el jugador (Agustín, 17 oct): con buen GPS (error
 * de 20 m o menos) y a 750 m o menos del centro del green, los metros a delante,
 * centro y fondo desde su posición: al centro, en recta; delante y fondo, eso
 * menos y más lo que mide el green del centro a su borde (sin contorno, 10 m). Si no se cumple, null: se usa la tarjeta (`distanciasDelHoyo`).
 *
 * @param {{posicion: Object|null, precision: number|null, green: Object|null}} datos
 * @returns {{front: number, center: number, back: number}|null}
 */
export const distanciasDesdeLaPosicion = ({ posicion, precision, green }) => {
  if (!posicion || !green?.center || !Number.isFinite(precision) || precision > PRECISION_PARA_MEDIR_M) return null;
  const center = distanciaEnMetros(posicion, green.center);
  if (center > MAX_AL_GREEN_M) return null;
  // Lo que mide el green del centro a cada borde, sobre la distancia al centro:
  // a los bordes en recta, de lado al green, delante podía salir más que el fondo
  const alBorde = (borde) => (green[borde] ? distanciaEnMetros(green.center, green[borde]) : METROS_AL_BORDE_DEL_GREEN);
  return { front: Math.max(0, center - alBorde('front')), center, back: center + alBorde('back') };
};
