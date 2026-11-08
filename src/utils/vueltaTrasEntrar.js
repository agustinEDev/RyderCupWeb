/**
 * A dónde volver tras entrar cuando la salida a `/login` fue una redirección DURA
 * (sesión caducada, dispositivo revocado, fallo de CSRF).
 *
 * `ProtectedRoute` manda al login con `state.from`, pero una redirección dura carga
 * `/login` como documento nuevo y ese estado se pierde: quien abría sin sesión el enlace
 * de confirmar el cambio de correo acababa en el panel tras entrar, con contraseña o con
 * Google (probador de la release, 8 nov 2026). La página se guarda en `sessionStorage`
 * antes de redirigir: dura lo que la pestaña.
 *
 * Las reglas, tras dos rondas de revisión:
 * 1. Guardar SUSTITUYE: o la página de ahora o nada; nunca queda una anterior.
 * 2. Toda redirección dura pasa por `redirigeAlLogin`: ningún camino se olvida de guardar.
 * 3. Salir a propósito no guarda nada: cerrar sesión, o revocar el propio dispositivo.
 * 4. Solo una entrada con éxito la gasta, con contraseña o con Google, o un alta (otra
 *    cuenta). Un fallo o cancelar Google la conservan: quien entra después con contraseña
 *    vuelve al enlace (Agustín, 8 nov 2026).
 * 5. Solo una ruta propia, ni login ni registro ni una página pública.
 */
import { rutaDeVuelta, rutaPropia } from './auth';
import { esRutaPublica } from './rutasPublicas';
import { seCierraLaSesionAPeticion } from './avisoDeCierreForzado';

const CLAVE = 'vuelta_tras_entrar';

const lugarActual = () => {
  const { pathname = '', search = '', hash = '' } = globalThis.location ?? {};
  return `${pathname}${search}${hash}`;
};

/** La olvida: al cerrar sesión, al salir sin guardar y una vez usada. */
export const olvidaLaVueltaTrasEntrar = () => {
  try {
    globalThis.sessionStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar
  }
};

/**
 * Guarda la página en la que se está, o nada si no vale: siempre sustituye a la anterior.
 */
export const guardaLaVueltaTrasEntrar = () => {
  olvidaLaVueltaTrasEntrar();
  // Al cerrar sesión a petición no hay a dónde volver: un sondeo en vuelo que reciba un
  // 401 en ese momento no deja la página para quien entre después
  if (seCierraLaSesionAPeticion()) return;
  const ruta = rutaPropia(lugarActual());
  // Ni login ni registro (`rutaDeVuelta` ya los descarta), ni una página pública: la
  // portada, verificar o restablecer, que además llevan su token
  if (!ruta || rutaDeVuelta({ pathname: ruta }) === '/dashboard') return;
  if (esRutaPublica(globalThis.location?.pathname ?? '')) return;
  try {
    globalThis.sessionStorage.setItem(CLAVE, ruta);
  } catch {
    // Sin almacenamiento, se vuelve al panel como siempre
  }
};

/**
 * La redirección dura al login, la única: guarda la página (o la olvida, si se sale a
 * propósito) y se va, al momento o tras `retraso` ms (para que se lea un aviso).
 */
export const redirigeAlLogin = ({ guardar = true, retraso = 0 } = {}) => {
  if (guardar) guardaLaVueltaTrasEntrar();
  else olvidaLaVueltaTrasEntrar();
  const vete = () => {
    globalThis.location.href = '/login';
  };
  if (retraso > 0) setTimeout(vete, retraso);
  else vete();
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
 * A dónde ir tras entrar: la ruta de la que vino (`state.from`, o la que trae Google) o,
 * si una redirección dura la perdió, la guardada. La guardada se gasta siempre.
 * Solo calcula: el silencio de un cierre anterior lo acaba quien entra de verdad (C5),
 * no la entrada sin red de la aplicación instalada, que también pasa por aquí.
 */
export const vueltaTrasEntrar = (from) => {
  const guardada = leeLaVueltaTrasEntrar();
  olvidaLaVueltaTrasEntrar();
  return rutaDeVuelta(from ?? guardada ?? undefined);
};
