import { esRutaPublica } from './rutasPublicas';

/**
 * Llevar a aceptar los Términos tras un 403 `TERMS_NOT_ACCEPTED` (F4).
 *
 * Con recarga, como las otras salidas forzadas (dispositivo revocado, CSRF), y
 * una sola vez aunque fallen diez llamadas a la vez. La llamada que lo provoca
 * NO se queda colgada: falla con su error marcado —la cola lo guarda para
 * después y suelta lo que iba de camino— y, mientras la página se va, los
 * toasts de error no se enseñan (`seVaAAceptarLosTerminos`).
 *
 * No se redirige desde:
 * - la propia pantalla de aceptar, completar perfil (donde acepta el usuario
 *   nuevo de Google) ni la gestión de dispositivos (se puede usar sin aceptar,
 *   para cerrar una sesión robada): sería un bucle;
 * - las rutas públicas: entre ellas están las páginas legales, y hay que poder
 *   leer lo que se va a aceptar.
 *
 * **Sin bucle aunque el servidor se contradiga.** Si una ruta da el 403 pero
 * current-user dice que los Términos están aceptados (un desfase de versiones),
 * la pantalla de aceptar devolvería a la ruta, la ruta volvería a dar el 403 y
 * se recargaría sin fin. La marca de la última redirección sobrevive a la
 * recarga en `sessionStorage`: la misma ruta no se redirige dos veces seguidas.
 */
const DONDE_NO_SE_REDIRIGE = ['/accept-terms', '/auth/complete-profile', '/profile/devices'];

/** Lo que dura la marca: si la página no se ha ido en este tiempo, no se va. */
const PLAZO_MS = 30_000;

const CLAVE = 'rydercup-terminos-redirigido';

let redirigidoEn = null;

const leeLaMarca = () => {
  try {
    return JSON.parse(globalThis.sessionStorage.getItem(CLAVE));
  } catch {
    return null;
  }
};

const apuntaLaMarca = (ruta, en) => {
  try {
    globalThis.sessionStorage.setItem(CLAVE, JSON.stringify({ ruta, en }));
  } catch {
    // Sin sessionStorage (ventana privada, bloqueado): sin guardia entre
    // recargas, pero la redirección sigue funcionando
  }
};

/** Si hay una redirección a la pantalla de aceptar en marcha. */
export const seVaAAceptarLosTerminos = () => redirigidoEn !== null && Date.now() - redirigidoEn < PLAZO_MS;

/**
 * @returns {boolean} si se ha ido (o ya se iba) a la pantalla de aceptar
 */
export const llevaAAceptarLosTerminos = () => {
  if (seVaAAceptarLosTerminos()) return true;
  const { pathname = '/', search = '' } = globalThis.location ?? {};
  if (DONDE_NO_SE_REDIRIGE.includes(pathname) || esRutaPublica(pathname)) return false;

  const ruta = `${pathname}${search}`;
  const ahora = Date.now();
  const marca = leeLaMarca();
  if (marca?.ruta === ruta && ahora - marca.en < PLAZO_MS) return false;

  redirigidoEn = ahora;
  apuntaLaMarca(ruta, ahora);
  globalThis.location.assign(`/accept-terms?from=${encodeURIComponent(ruta)}`);
  return true;
};

/** Para las pruebas, o una recarga: la marca del módulo vive lo que la página. */
export const olvidaLaRedireccionATerminos = () => {
  redirigidoEn = null;
};
