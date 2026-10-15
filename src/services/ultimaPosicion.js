import { esPosicionValida } from '../domain/services/geometriaDelHoyo';

/**
 * La última posición buena del GPS (mapa de hoyos, BE #532), para abrir el mapa
 * de un hoyo sin mapa cerca de donde estabas mientras el GPS no da señal.
 *
 * Es un dato de la persona: se olvida al cerrar sesión, o en un móvil
 * compartido diría a la siguiente cuenta dónde estuvo la anterior.
 */
export const CLAVE_ULTIMA_POSICION = 'mapaDeHoyos:ultimaPosicion';

export const recordarPosicion = (posicion) => {
  try {
    if (esPosicionValida(posicion)) globalThis.localStorage.setItem(CLAVE_ULTIMA_POSICION, JSON.stringify(posicion));
  } catch {
    // Sin almacenamiento: la próxima vez se espera al GPS
  }
};

export const leerUltimaPosicion = () => {
  try {
    const posicion = JSON.parse(globalThis.localStorage.getItem(CLAVE_ULTIMA_POSICION));
    return esPosicionValida(posicion) ? posicion : null;
  } catch {
    return null;
  }
};

export const olvidaLaUltimaPosicion = () => {
  try {
    globalThis.localStorage.removeItem(CLAVE_ULTIMA_POSICION);
  } catch {
    // Nada que olvidar
  }
};
