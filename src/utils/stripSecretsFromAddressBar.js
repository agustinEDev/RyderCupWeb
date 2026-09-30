/**
 * Quita de la barra de direcciones los secretos que trae la URL: el token del
 * enlace de restablecimiento o de verificacion, y el code/state de Google.
 *
 * La pagina lo llama en cuanto los ha leido. Replay graba el href de la pagina
 * sin pasar por ningun gancho de Sentry, y la barra acaba tambien en el
 * Referer y en el historial del navegador (revision del 30 sep 2026).
 *
 * Va por `history.replaceState` directo, sin el router: asi el router no se
 * entera y la pagina sigue teniendo su token.
 *
 * El token se guarda en el estado de esa entrada del historial, que no sale en
 * la barra ni lo graba Replay y que el navegador conserva al recargar y al
 * volver atras. Sin eso, una recarga -tambien la que hace sola la app al
 * entrar una version nueva- dejaba el enlace inservible. El code y el state de
 * Google no se guardan: son de un solo uso.
 */
import { SENSITIVE_PATH_PREFIXES } from './scrubUrl';

/** Los secretos que pueden venir en la barra; lat/lon no lo son. */
const ADDRESS_BAR_PARAMS = ['token', 'code', 'state'];

/** Los que se guardan para poder recargar. */
const RECOVERABLE = ['token'];

const HISTORY_KEY = 'secretosDeLaUrl';

const WAIT_INTERVAL_MS = 250;

/** La barra sin secretos, y los que se han quitado. */
const cleanAddressBar = () => {
  const { pathname, search, hash } = window.location;

  const params = new URLSearchParams(search);
  const quitados = {};
  for (const param of ADDRESS_BAR_PARAMS) {
    if (params.has(param)) quitados[param] = params.get(param);
    params.delete(param);
  }
  const query = params.toString();

  let ruta = pathname;
  const prefijo = SENSITIVE_PATH_PREFIXES.find((p) => pathname.startsWith(p));
  if (prefijo) {
    const [enLaRuta] = pathname.slice(prefijo.length).split('/');
    if (enLaRuta) quitados.token = decodeURIComponent(enLaRuta);
    ruta = prefijo.replace(/\/$/, '');
  }

  const limpia = `${ruta}${query ? `?${query}` : ''}${hash}`;
  return { limpia, cambia: limpia !== `${pathname}${search}${hash}`, quitados };
};

export const addressBarHasSecrets = () => cleanAddressBar().cambia;

export const stripSecretsFromAddressBar = () => {
  const { limpia, cambia, quitados } = cleanAddressBar();
  if (!cambia) return;

  const estado = window.history.state || {};
  const guardados = { ...estado[HISTORY_KEY] };
  for (const nombre of RECOVERABLE) {
    if (quitados[nombre]) guardados[nombre] = quitados[nombre];
  }
  window.history.replaceState({ ...estado, [HISTORY_KEY]: guardados }, '', limpia);
};

/**
 * El secreto que se quito de la barra de esta entrada del historial, para que
 * la pagina lo recupere al recargar.
 *
 * @param {string} nombre p. ej. 'token'
 * @returns {string | null}
 */
export const readStrippedSecret = (nombre) => window.history.state?.[HISTORY_KEY]?.[nombre] ?? null;

/**
 * Llama a `callback` cuando la barra no lleve secretos: Replay graba el href
 * de la pagina al empezar, sin pasar por ningun gancho, asi que no se carga
 * mientras la pagina no haya limpiado la barra. Si nunca la limpia (su trozo
 * no llega a cargar), en esa pagina no hay Replay: mejor eso que el token.
 *
 * @param {() => void} callback
 */
export const whenAddressBarIsClean = (callback) => {
  if (!addressBarHasSecrets()) {
    callback();
    return;
  }
  const id = setInterval(() => {
    if (addressBarHasSecrets()) return;
    clearInterval(id);
    callback();
  }, WAIT_INTERVAL_MS);
};
