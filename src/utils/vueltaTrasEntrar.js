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
 *    anterior. La cuenta es la ÚLTIMA que estuvo dentro de la pestaña (regla 8): tras
 *    salir en ella, la página es solo de esa cuenta; si nunca hubo nadie (un enlace abierto
 *    sin sesión), vale para quien entre.
 * 7. La de confirmar el correo sin su token (ya usado) no se guarda ni se vuelve a ella,
 *    venga la vuelta de donde venga (`rutaDeVuelta`): diría «Este enlace no vale» con el
 *    correo ya cambiado (Agustín, 8 nov 2026).
 * 8. La de la que venía (`state.from`) y la vuelta de Google llevan la última cuenta de
 *    la pestaña: si entra otra, a su panel; sin cuenta apuntada, para cualquiera (FE #1064).
 */
import { esLaPaginaDeConfirmar, rutaDeVuelta, rutaPropia } from './auth';
import { esRutaPublica } from './rutasPublicas';
import { seCierraLaSesionAPeticion } from './avisoDeCierreForzado';
import { readStrippedSecret } from './stripSecretsFromAddressBar';
import { leeLaAnotacionEnCurso } from './anotacionEnCurso';
import { avisaDeLaVueltaALaAnotacion } from './avisoDeVueltaALaAnotacion';

const CLAVE = 'vuelta_tras_entrar';
const CLAVE_DE_LA_CUENTA = 'vuelta_tras_entrar_cuenta';

const lugarActual = () => {
  const { pathname = '', search = '', hash = '' } = globalThis.location ?? {};
  // El token que la página de confirmar el correo quitó de la barra y guardó en el
  // historial: sin él, la página guardada no valía al volver (T1-T2, 8 nov 2026). Solo
  // en esa página y solo el token (el code y el state de Google son de un solo uso), y
  // añadido sin reescribir el resto de la barra (`%20`, `?flag`)
  const token = esLaPaginaDeConfirmar(pathname) ? readStrippedSecret('token') : null;
  if (!token || new URLSearchParams(search).has('token')) return `${pathname}${search}${hash}`;
  const separador = search && search !== '?' ? '&' : '?';
  const base = search === '?' ? '' : search;
  return `${pathname}${base}${separador}token=${encodeURIComponent(token)}${hash}`;
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

/** Un id de cuenta como texto, o `null` si no hay: la única forma de compararlos. */
const aIdDeCuenta = (id) => (id == null ? null : String(id));

// La ÚLTIMA cuenta que estuvo dentro de esta pestaña (FE #1064, R2), con tres estados:
// - `undefined`: no se sabe (nada anotado aún): se mira el usuario guardado;
// - `null`: aquí no hay nadie (la pestaña arrancó sin usuario, o se cerró sesión a
//   propósito, R3): no se mira el usuario guardado, que puede ser de otra pestaña;
// - un id: estuvo esa cuenta; se conserva aunque la sesión caiga, que es justo cuando el
//   login necesita saber de quién era la página.
let ultimaCuenta;

/**
 * `AuthContext`, al arrancar, al entrar y al salir: una cuenta pasa a ser la última; sin
 * cuenta, solo cambia «no se sabe» por «no hay nadie» (una sesión que cae conserva la que
 * hubo).
 */
export const anotaLaCuentaDeEstaPestana = (id) => {
  const cuenta = aIdDeCuenta(id);
  if (cuenta !== null) ultimaCuenta = cuenta;
  else if (ultimaCuenta === undefined) ultimaCuenta = null;
};

/** SOLO para los tests: una pestaña recién abierta, en «no se sabe». */
export const olvidaLaCuentaDeEstaPestana = () => {
  ultimaCuenta = undefined;
};

/** Cerrar sesión a propósito: «no hay nadie»; quien entre después no hereda nada (R3). */
export const olvidaLaUltimaCuenta = () => {
  ultimaCuenta = null;
};

/** El id del usuario guardado en el dispositivo, o `null`. */
const cuentaDelUsuarioGuardado = () => {
  try {
    return aIdDeCuenta(JSON.parse(globalThis.localStorage.getItem('user'))?.id);
  } catch {
    return null;
  }
};

/**
 * La última cuenta que estuvo dentro de esta pestaña, o `null`: la que lleva la página de
 * la que venía al ir al login (R1). Si nadie la anotó aún, la del usuario guardado.
 */
export const ultimaCuentaDeEstaPestana = () => {
  if (ultimaCuenta !== undefined) return ultimaCuenta;
  return cuentaDelUsuarioGuardado();
};

/**
 * El estado con el que se va al login: la página de la que venía y la última cuenta de la
 * pestaña (R1). La única forma de construirlo, para que ninguna redirección al login se
 * olvide de la cuenta (revisión, FE #1064).
 * @param {{pathname: string, search?: string, hash?: string}} location
 */
export const estadoParaElLogin = (location) => ({
  from: {
    pathname: location.pathname,
    search: location.search ?? '',
    hash: location.hash ?? '',
    cuenta: ultimaCuentaDeEstaPestana(),
  },
});

/**
 * Guarda la página en la que se está, con la cuenta que estaba dentro si se sabe, o nada
 * si no vale: siempre sustituye a la anterior, cuenta incluida.
 */
export const guardaLaVueltaTrasEntrar = ({ cuenta = null } = {}) => {
  olvidaLaVueltaTrasEntrar();
  // Al cerrar sesión a petición no hay a dónde volver: un sondeo en vuelo que reciba un
  // 401 en ese momento no deja la página para quien entre después
  if (seCierraLaSesionAPeticion()) return;
  const ruta = rutaPropia(lugarActual());
  // Ni login ni registro (`rutaDeVuelta` ya los descarta), ni la de confirmar el correo
  // sin su token (regla 7, también en `rutaDeVuelta`), ni una página pública: la
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
 *
 * Sin ninguna de las dos, la anotación en curso de esa cuenta (11 nov 2026): iOS cerró la
 * app anotando y al abrirla arranca de cero. `arranque`: es el arranque de la aplicación
 * instalada, y esa vuelta se avisa a Sentry para medir cuántas veces pasa.
 */
export const vueltaTrasEntrar = (from, { cuenta = null, arranque = false } = {}) => {
  // La de la que venía, si apunta la cuenta que estaba dentro, solo para esa cuenta (FE
  // #1064, R4-R6): otra, a su panel. Sin cuenta apuntada, para cualquiera, como siempre
  const fromDeOtra =
    from?.cuenta != null && (aIdDeCuenta(cuenta) === null || aIdDeCuenta(from.cuenta) !== aIdDeCuenta(cuenta));
  if (fromDeOtra) {
    olvidaLaVueltaTrasEntrar();
    return '/dashboard';
  }
  const deQuien = cuentaDeLaVuelta();
  const esSuya = deQuien === null || (aIdDeCuenta(cuenta) !== null && deQuien === aIdDeCuenta(cuenta));
  const guardada = esSuya ? leeLaVueltaTrasEntrar() : null;
  olvidaLaVueltaTrasEntrar();
  if (from == null && guardada === null) {
    const anotacion = leeLaAnotacionEnCurso({ cuenta });
    // La lista cerrada ya la filtra; `rutaPropia`, por si acaso, como toda vuelta
    const ruta = anotacion ? rutaPropia(anotacion.ruta) : null;
    if (ruta) {
      if (arranque) avisaDeLaVueltaALaAnotacion(anotacion);
      return ruta;
    }
  }
  return rutaDeVuelta(from ?? guardada ?? undefined);
};
