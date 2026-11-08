/**
 * A dónde volver tras entrar cuando la salida a `/login` fue una redirección DURA
 * (sesión caducada, dispositivo revocado, fallo de CSRF).
 *
 * `ProtectedRoute` manda al login con `state.from`, pero una redirección dura carga
 * `/login` como documento nuevo y ese estado se pierde: quien abría sin sesión el enlace
 * de confirmar el cambio de correo acababa en el panel tras entrar, con contraseña o con
 * Google (probador de la release, 8 nov 2026). La página se guarda en `sessionStorage`
 * antes de redirigir: dura lo que la pestaña, y solo una ruta propia.
 */
import { rutaDeVuelta, rutaPropia } from './auth';

const CLAVE = 'vuelta_tras_entrar';

const lugarActual = () => {
  const { pathname = '', search = '', hash = '' } = globalThis.location ?? {};
  return `${pathname}${search}${hash}`;
};

/** Guarda la página en la que se está, si es propia, antes de una redirección dura. */
export const guardaLaVueltaTrasEntrar = () => {
  const ruta = rutaPropia(lugarActual());
  // `rutaDeVuelta` ya descarta login y registro: si no cambia nada, no se guarda
  if (!ruta || rutaDeVuelta({ pathname: ruta }) === '/dashboard') return;
  try {
    globalThis.sessionStorage.setItem(CLAVE, ruta);
  } catch {
    // Sin almacenamiento, se vuelve al panel como siempre
  }
};

/**
 * La página guardada, como un `location` (lo que espera `rutaDeVuelta`), sin borrarla.
 * @returns {{pathname: string, search: string, hash: string}|null}
 */
export const leeLaVueltaTrasEntrar = () => {
  let ruta = null;
  try {
    ruta = rutaPropia(globalThis.sessionStorage.getItem(CLAVE));
  } catch {
    return null;
  }
  if (!ruta) return null;
  const url = new globalThis.URL(ruta, globalThis.location.origin);
  return { pathname: url.pathname, search: url.search, hash: url.hash };
};

/**
 * A dónde ir tras entrar: la ruta de la que vino (`state.from`) o, si una redirección
 * dura la perdió, la guardada. La guardada se gasta: solo vale una vez.
 */
export const vueltaTrasEntrar = (from) => {
  const guardada = leeLaVueltaTrasEntrar();
  try {
    globalThis.sessionStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar
  }
  return rutaDeVuelta(from ?? guardada ?? undefined);
};
