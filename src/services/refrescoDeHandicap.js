import { refreshOwnHandicapUseCase } from '../composition';
import { consultaLaSesion } from './sesionCompartida';

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

export const APUNTE_REFRESCAR = 'refrescar_handicap';
const HANDICAP_POR_PEDIR = 'pedir_handicap';
export const EVENTO_HANDICAP_POR_PEDIR = 'pedir-handicap';

// Uno a la vez: el login lo lanza y, un instante después, el panel ve el
// apunte todavía puesto. Sin esto salían dos peticiones a la RFEG
let enVuelo = null;

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
  if (enVuelo) return enVuelo;

  enVuelo = refreshOwnHandicapUseCase
    .execute()
    .then(({ needsHandicap, handicap }) => {
      localStorage.removeItem(APUNTE_REFRESCAR);
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
      if (esPermanente(error)) localStorage.removeItem(APUNTE_REFRESCAR);
    })
    .finally(() => {
      enVuelo = null;
    });

  return enVuelo;
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
};
