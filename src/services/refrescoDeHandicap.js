import { refreshOwnHandicapUseCase } from '../composition';
import { consultaLaSesion } from './sesionCompartida';
import {
  APUNTE_REFRESCAR,
  HANDICAP_POR_PEDIR,
  generacionDelRefresco,
} from './refrescoDeHandicapApuntes';

export { APUNTE_REFRESCAR };

/**
 * El refresco del hándicap al entrar (FE #677).
 *
 * Lo hacía el propio login, esperando a la RFEG antes de contestar
 * (RyderCupAM#340). Ahora el login lo LANZA y sigue: nadie espera esta promesa,
 * así que una RFEG caída no retiene ninguna pantalla. Se lanza desde el login y
 * no desde el panel porque el login devuelve a la página que se pidió, que no
 * siempre es el panel.
 *
 * El panel solo recoge el resultado para abrir el modal: si llega con el panel
 * montado, por el evento; si no, lo encuentra guardado al abrirse.
 */

export const EVENTO_HANDICAP_POR_PEDIR = 'pedir-handicap';

// Uno a la vez: el login lo lanza y, un instante después, el panel ve el
// apunte todavía puesto. Sin esto salían dos peticiones a la RFEG. Va con la
// generación en que se lanzó: si entretanto se cerró sesión, es de otra cuenta
let enVuelo = null;
let generacionEnVuelo = null;

const esPermanente = (error) => error?.status >= 400 && error?.status < 500;

/**
 * Lanza el refresco. No hace falta esperarlo, y nadie debería.
 *
 * @param {Object} [opciones]
 * @param {number|null} [opciones.handicapDeAntes] - El que tenía el usuario al
 *   lanzarlo: solo si cambia merece la pena recargar la sesión, que relanza las
 *   peticiones de la pantalla abierta.
 * @returns {Promise<void>} Resuelve siempre; los fallos se quedan aquí dentro.
 */
export const lanzaElRefrescoDeHandicap = ({ handicapDeAntes = null } = {}) => {
  const generacion = generacionDelRefresco();
  if (enVuelo && generacionEnVuelo === generacion) return enVuelo;
  const esDeOtraCuenta = () => generacion !== generacionDelRefresco();

  const peticion = refreshOwnHandicapUseCase
    .execute()
    .then(({ needsHandicap, handicap }) => {
      if (esDeOtraCuenta()) return;
      localStorage.removeItem(APUNTE_REFRESCAR);
      // Lo que quedara pendiente de otro día ya no vale, sea cual sea la respuesta
      localStorage.removeItem(HANDICAP_POR_PEDIR);
      if (needsHandicap) {
        localStorage.setItem(HANDICAP_POR_PEDIR, JSON.stringify({ handicap }));
        globalThis.dispatchEvent(new globalThis.Event(EVENTO_HANDICAP_POR_PEDIR));
      } else if (handicap !== (handicapDeAntes ?? null)) {
        consultaLaSesion({ forzar: true });
      }
    })
    .catch((error) => {
      // Un 4xx no se va a arreglar solo (el endpoint no existe, el usuario ya
      // no): se deja de intentar. Sin respuesta o un 5xx no se sabe nada, así
      // que no se afirma nada y el apunte se queda para reintentar
      if (esPermanente(error) && !esDeOtraCuenta()) localStorage.removeItem(APUNTE_REFRESCAR);
    })
    .finally(() => {
      if (enVuelo === peticion) enVuelo = null;
    });

  enVuelo = peticion;
  generacionEnVuelo = generacion;
  return peticion;
};

/**
 * Lo que dejó pendiente el último refresco, una sola vez.
 *
 * @returns {number|null|undefined} El hándicap guardado cuando hay que pedirlo
 *   (null si no tiene ninguno), o `undefined` si no hay nada que pedir.
 */
export const recogeElHandicapPorPedir = () => {
  const guardado = localStorage.getItem(HANDICAP_POR_PEDIR);
  if (guardado === null) return undefined;
  localStorage.removeItem(HANDICAP_POR_PEDIR);
  try {
    return JSON.parse(guardado).handicap ?? null;
  } catch {
    return null;
  }
};

/** Solo para tests: el estado del módulo sobrevive de un test a otro. */
export const reiniciaElRefrescoDeHandicap = () => {
  enVuelo = null;
  generacionEnVuelo = null;
};
