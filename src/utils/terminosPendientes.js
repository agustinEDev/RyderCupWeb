import { esRutaPublica, normalizaLaRuta, sePuedeEstarConTerminosPendientes } from './rutasPublicas';

/**
 * Llevar a aceptar los Términos tras un 403 `TERMS_NOT_ACCEPTED` (F4).
 *
 * Con recarga, como las otras salidas forzadas (dispositivo revocado, CSRF), y
 * nunca dos veces en la misma carga de la aplicación, aunque fallen diez
 * llamadas a la vez o un sondeo insista. La llamada que lo provoca NO se queda
 * colgada: falla con su error marcado —la cola lo guarda para después y suelta
 * lo que iba de camino— y solo SU aviso se calla (`silenciaElAviso`): los
 * demás errores se siguen viendo.
 *
 * No se redirige desde las rutas de `RUTAS_CON_TERMINOS_PENDIENTES` (la misma
 * lista que usa el guardia de rutas) ni desde las públicas: entre ellas están
 * las páginas legales, y hay que poder leer lo que se va a aceptar.
 *
 * **Sin bucle aunque el servidor se contradiga.** Si una ruta da el 403 pero
 * current-user dice que los Términos están aceptados, la pantalla de aceptar
 * devolvería a la ruta, la ruta volvería a dar el 403 y se recargaría sin fin.
 * La ruta de la última redirección se apunta en `sessionStorage`, que sobrevive
 * a la recarga: si al volver ESA ruta da otra vez el 403, es un desacuerdo, y en
 * esta carga ya no se redirige más. El error se enseña como «no disponible».
 */
const PLAZO_MS = 30_000;

const CLAVE = 'rydercup-terminos-redirigido';

// De esta carga de la aplicación: una recarga los pierde, y es lo que se busca
let redirigidaEn = null;
let hayDesacuerdo = false;
const silenciados = new Set();

const leeLaMarca = () => {
  try {
    return JSON.parse(globalThis.sessionStorage.getItem(CLAVE));
  } catch {
    return null;
  }
};

const apuntaLaMarca = (ruta) => {
  try {
    globalThis.sessionStorage.setItem(CLAVE, JSON.stringify({ ruta }));
  } catch {
    // Sin sessionStorage (ventana privada, bloqueado): queda el guardia en
    // memoria, que evita al menos la segunda redirección en esta carga
  }
};

/**
 * Lleva a la pantalla de aceptar, si toca.
 *
 * @returns {boolean} si la página se está yendo a la pantalla de aceptar: con
 *   eso, el aviso del error que lo provocó se calla. Pasado un plazo sin que la
 *   página se haya ido, deja de decirlo, pero NUNCA redirige otra vez
 */
export const llevaAAceptarLosTerminos = () => {
  if (redirigidaEn !== null) return Date.now() - redirigidaEn < PLAZO_MS;
  if (hayDesacuerdo) return false;

  const { pathname: tal = '/', search = '' } = globalThis.location ?? {};
  const pathname = normalizaLaRuta(tal);
  if (sePuedeEstarConTerminosPendientes(pathname) || esRutaPublica(pathname)) return false;

  const ruta = `${pathname}${search}`;
  if (leeLaMarca()?.ruta === ruta) {
    hayDesacuerdo = true;
    return false;
  }

  redirigidaEn = Date.now();
  apuntaLaMarca(ruta);
  globalThis.location.assign(`/accept-terms?from=${encodeURIComponent(ruta)}`);
  return true;
};

/** El aviso de la llamada cortada por irse a aceptar: no se enseña. */
export const silenciaElAviso = (mensaje) => {
  silenciados.add(mensaje);
};

/** Si este aviso es el de una llamada cortada por irse a aceptar los Términos. */
export const esUnAvisoSilenciado = (mensaje) => silenciados.has(mensaje);

/** Para las pruebas, o una recarga: todo esto vive lo que la carga de la página. */
export const olvidaLaRedireccionATerminos = () => {
  redirigidaEn = null;
  hayDesacuerdo = false;
  silenciados.clear();
};
