import { esRutaPublica } from './rutasPublicas';

/**
 * Llevar a aceptar los Términos tras un 403 `TERMS_NOT_ACCEPTED` (F4).
 *
 * Con recarga, como las otras salidas forzadas (dispositivo revocado, CSRF):
 * la recarga corta las peticiones en vuelo, y con ellas los toasts que cada
 * pantalla habría enseñado y los bucles que habrían reintentado. Una sola vez
 * por carga de página: si fallan diez llamadas a la vez, se redirige una.
 *
 * No se redirige desde:
 * - la propia pantalla de aceptar ni completar perfil (donde acepta el usuario
 *   nuevo de Google): sería un bucle;
 * - las rutas públicas: entre ellas están las páginas legales, y hay que poder
 *   leer lo que se va a aceptar.
 */
const DONDE_NO_SE_REDIRIGE = ['/accept-terms', '/auth/complete-profile'];

let redirigiendo = false;

/**
 * @returns {boolean} si se ha ido (o ya se iba) a la pantalla de aceptar
 */
export const llevaAAceptarLosTerminos = () => {
  if (redirigiendo) return true;
  const { pathname = '/', search = '' } = globalThis.location ?? {};
  if (DONDE_NO_SE_REDIRIGE.includes(pathname) || esRutaPublica(pathname)) return false;

  redirigiendo = true;
  globalThis.location.assign(`/accept-terms?from=${encodeURIComponent(`${pathname}${search}`)}`);
  return true;
};

/** Para las pruebas: la marca vive lo que la página, y allí no se recarga. */
export const olvidaLaRedireccionATerminos = () => {
  redirigiendo = false;
};
