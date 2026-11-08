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
 * 6. Va con la cuenta que estaba dentro: si entra OTRA, va al panel y se borra; guardada
 *    sin cuenta (de antes, o sin saber quién estaba), vale para cualquiera (Agustín, 8 nov
 *    2026). En un móvil compartido, la siguiente persona no aterriza en la página de la
 *    anterior. Si la pestaña sabe que no hay nadie dentro, no se guarda.
 */
import { rutaDeVuelta, rutaPropia } from './auth';
import { esRutaPublica } from './rutasPublicas';
import { seCierraLaSesionAPeticion } from './avisoDeCierreForzado';
import { readStrippedSecret } from './stripSecretsFromAddressBar';

const CLAVE = 'vuelta_tras_entrar';
const CLAVE_DE_LA_CUENTA = 'vuelta_tras_entrar_cuenta';

const lugarActual = () => {
  const { pathname = '', search = '', hash = '' } = globalThis.location ?? {};
  // El token que la página quitó de la barra y guardó en el historial (confirmar el
  // correo): sin él, la página guardada no valía al volver (T1-T2, 8 nov 2026). Solo el
  // token: el code y el state de Google son de un solo uso
  const token = readStrippedSecret('token');
  const params = new URLSearchParams(search);
  if (!token || params.has('token')) return `${pathname}${search}${hash}`;
  params.append('token', token);
  return `${pathname}?${params.toString()}${hash}`;
};

/** La olvida, con su cuenta: al cerrar sesión, al salir sin guardar y una vez usada. */
export const olvidaLaVueltaTrasEntrar = () => {
  try {
    globalThis.sessionStorage.removeItem(CLAVE);
    globalThis.sessionStorage.removeItem(CLAVE_DE_LA_CUENTA);
  } catch {
    // Nada que borrar
  }
};

// La cuenta de ESTA pestaña, en memoria (revisión, 8 nov 2026): `localStorage` lo
// comparten las pestañas. Con dos abiertas, el cierre de la primera borra el usuario y la
// segunda guardaba su página sin cuenta (válida para cualquiera), o con la de otra cuenta
// que entrara en otra pestaña. La anota `AuthContext` al arrancar, al entrar y al salir;
// `undefined` = nadie la ha anotado todavía
let cuentaDeEstaPestana;

/** Un id de cuenta como texto, o `null` si no hay: la única forma de compararlos. */
const aIdDeCuenta = (id) => (id == null ? null : String(id));

/** `AuthContext`: la cuenta de esta pestaña, o `null` al salir. */
export const anotaLaCuentaDeEstaPestana = (id) => {
  cuentaDeEstaPestana = aIdDeCuenta(id);
};

/** SOLO para los tests: una pestaña recién abierta, sin nada anotado. */
export const olvidaLaCuentaDeEstaPestana = () => {
  cuentaDeEstaPestana = undefined;
};

/**
 * El id de la cuenta de esta pestaña, o `null` si no se sabe: la anotada en memoria y, si
 * nadie la anotó, la del usuario guardado. Los cierres forzados lo leen ANTES de limpiar
 * la cuenta, para guardar la página con él (regla 6).
 */
export const quienEstaDentro = () => {
  if (cuentaDeEstaPestana !== undefined) return cuentaDeEstaPestana;
  try {
    return aIdDeCuenta(JSON.parse(globalThis.localStorage.getItem('user'))?.id);
  } catch {
    return null;
  }
};

/**
 * Guarda la página en la que se está, con la cuenta que estaba dentro si se sabe, o nada
 * si no vale: siempre sustituye a la anterior, cuenta incluida.
 */
export const guardaLaVueltaTrasEntrar = ({ cuenta = null } = {}) => {
  olvidaLaVueltaTrasEntrar();
  // Al cerrar sesión a petición no hay a dónde volver: un sondeo en vuelo que reciba un
  // 401 en ese momento no deja la página para quien entre después
  if (seCierraLaSesionAPeticion()) return;
  // Esta pestaña sabe que no hay nadie dentro (cerró la sesión): un cierre forzado tardío
  // no tiene a quién devolver, y sin cuenta la página valdría para cualquiera (Agustín,
  // 8 nov 2026)
  if (aIdDeCuenta(cuenta) === null && cuentaDeEstaPestana === null) return;
  const ruta = rutaPropia(lugarActual());
  // Ni login ni registro (`rutaDeVuelta` ya los descarta), ni una página pública: la
  // portada, verificar o restablecer, que además llevan su token
  if (!ruta || rutaDeVuelta({ pathname: ruta }) === '/dashboard') return;
  if (esRutaPublica(globalThis.location?.pathname ?? '')) return;
  try {
    // La cuenta primero: si escribir la página falla, no queda una página sin su cuenta
    const id = aIdDeCuenta(cuenta);
    if (id !== null) globalThis.sessionStorage.setItem(CLAVE_DE_LA_CUENTA, id);
    globalThis.sessionStorage.setItem(CLAVE, ruta);
  } catch {
    // Sin almacenamiento, se vuelve al panel como siempre
  }
};

/**
 * La redirección dura al login, la única: guarda la página (o la olvida, si se sale a
 * propósito) y se va, al momento o tras `retraso` ms (para que se lea un aviso).
 */
export const redirigeAlLogin = ({ guardar = true, retraso = 0, cuenta = null } = {}) => {
  if (guardar) guardaLaVueltaTrasEntrar({ cuenta });
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

/** La cuenta con la que se guardó la página, o `null` si se guardó sin ella. */
const cuentaDeLaVuelta = () => {
  try {
    return globalThis.sessionStorage.getItem(CLAVE_DE_LA_CUENTA);
  } catch {
    return null;
  }
};

/**
 * A dónde ir tras entrar: la ruta de la que vino (`state.from`, o la que trae Google) o,
 * si una redirección dura la perdió, la guardada, solo si es de la cuenta que entra
 * (`cuenta`; regla 6). La guardada se gasta siempre.
 * Solo calcula: el silencio de un cierre anterior lo acaba quien entra de verdad (C5),
 * no la entrada sin red de la aplicación instalada, que también pasa por aquí.
 */
export const vueltaTrasEntrar = (from, { cuenta = null } = {}) => {
  const deQuien = cuentaDeLaVuelta();
  const esSuya = deQuien === null || (aIdDeCuenta(cuenta) !== null && deQuien === aIdDeCuenta(cuenta));
  const guardada = esSuya ? leeLaVueltaTrasEntrar() : null;
  olvidaLaVueltaTrasEntrar();
  return rutaDeVuelta(from ?? guardada ?? undefined);
};
