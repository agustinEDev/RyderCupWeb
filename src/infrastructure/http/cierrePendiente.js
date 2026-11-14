/**
 * El cierre de sesión que no llegó al servidor (auditoría de la fase 6, F-01).
 *
 * Las cookies de la sesión son httpOnly: solo el servidor las borra. Si alguien
 * cierra la sesión sin cobertura, la app queda «fuera» pero la sesión sigue viva
 * en el móvil, y quien lo abra después entra en su cuenta. Por eso el cierre de
 * sesión (`ApiAuthRepository.logout`) apunta aquí una marca ANTES de llamar al
 * servidor, y se borra cuando confirma;
 * mientras siga, el transporte y la sonda de la sesión mandan primero el cierre
 * (`esperaAlCierrePendiente`) y, sin red, fallan como «sin conexión» sin llegar
 * a preguntar por la sesión. El evento `online` lo manda en cuanto vuelve la red.
 *
 * El envío va por `fetch` a pelo, sin el interceptor: un refresco rechazado ahí
 * dispara la salida forzada con recarga, y con la marca puesta eso sería un
 * bucle. Aquí basta con saber si la sesión sigue viva:
 * - 2xx: cerrada.
 * - 401: el acceso pudo caducar (dura 15 minutos y la marca puede tener días):
 *   se refresca una vez y se repite. Si el refresco también dice 401, la sesión
 *   ya estaba muerta. Si el refresco va bien, solo vale que el cierre diga 2xx.
 * - Sin red, sin respuesta a tiempo (también al leer el cuerpo), un 5xx, un 408,
 *   un 429 o cualquier otro 4xx que no sea de la app (de Cloudflare o de un proxy,
 *   sin `error_code`): no se sabe si cerró; la marca sigue.
 * - Otro 4xx de la app (con su `error_code`): se da por cerrada. Quedarse con la
 *   marca dejaría la app sin poder hablar con la API.
 * - Una marca de más de 7 días se olvida: es lo que dura la cookie de refresco, así
 *   que la sesión ya no puede estar viva, y la app no se queda atascada para siempre.
 *
 * Entre pestañas, un envío a la vez (`navigator.locks`), y antes de cada paso se
 * vuelve a mirar la marca: si otra pestaña cerró y alguien entró, refrescar aquí
 * mataría la sesión nueva (revisor de la rama).
 */
import { getCsrfCookie } from './csrfTokenSync';
import { getApiBaseUrl } from './urlDeLaApi';
import { cabeceraDelModoDeLaApp } from '../../utils/modoDeLaApp';

const CLAVE = 'rydercup-cierre-pendiente';
const TOPE_MS = 10_000;
/** Lo que dura la cookie de refresco: pasado esto no queda sesión que cerrar. */
const CADUCA_MS = 7 * 24 * 60 * 60 * 1000;

/** El usuario pidió cerrar la sesión: hasta que el servidor confirme, queda pendiente. */
export const apuntaElCierrePendiente = () => {
  try {
    globalThis.localStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // Sin almacenamiento no hay marca; el cierre se intenta igual
  }
};

const leeLaMarca = () => {
  try {
    return globalThis.localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
};

/** Si hay un cierre de sesión que el servidor no ha confirmado. */
export const hayCierrePendiente = () => leeLaMarca() !== null;

const caducada = () => Date.now() - Number(leeLaMarca()) > CADUCA_MS;

/** El servidor ya cerró la sesión (o ya no existe). */
export const olvidaElCierrePendiente = () => {
  try {
    globalThis.localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento no había marca
  }
};

/** El fallo de red de siempre: quien lo reciba lo trata como «sin conexión». */
const sinConexion = (causa) =>
  new TypeError('Pending sign-out could not reach the server', {
    cause: causa,
  });

/** Si el cuerpo es de la app: un JSON con su `error_code`. */
const esDeLaApp = async (respuesta) => {
  try {
    return Boolean((await respuesta.json())?.error_code);
  } catch {
    return false;
  }
};

/**
 * Un POST con tope de tiempo, que cubre también la lectura del cuerpo (con mala
 * cobertura puede pararse con las cabeceras ya recibidas, y aquí se tiene el
 * candado). Devuelve el estado y si un 4xx es de la app.
 * @throws {TypeError} Sin red o sin respuesta a tiempo
 */
const post = async (ruta, cabeceras = {}) => {
  const corte = new AbortController();
  const temporizador = setTimeout(() => corte.abort(), TOPE_MS);
  try {
    const respuesta = await fetch(`${getApiBaseUrl()}${ruta}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...cabeceraDelModoDeLaApp(),
        ...cabeceras,
      },
      body: JSON.stringify({}),
      signal: corte.signal,
    });
    const { ok, status } = respuesta;
    const deLaApp =
      !ok && status >= 400 && status < 500 && (await esDeLaApp(respuesta));
    return { ok, status, deLaApp };
  } catch (error) {
    throw sinConexion(error);
  } finally {
    clearTimeout(temporizador);
  }
};

const cierra = () => {
  const csrf = getCsrfCookie();
  return post('/api/v1/auth/logout', csrf ? { 'X-CSRF-Token': csrf } : {});
};

/** Un «no» de la app que no es de caducidad ni de freno: la sesión no se puede cerrar más. */
const rechazoDeLaApp = ({ status, deLaApp }) =>
  deLaApp && ![401, 408, 429].includes(status);

const envia = async () => {
  const respuesta = await cierra();
  if (respuesta.ok) return;
  if (respuesta.status !== 401) {
    if (rechazoDeLaApp(respuesta)) return;
    throw sinConexion();
  }
  // Otra pestaña lo resolvió mientras: refrescar mataría su sesión nueva
  if (!hayCierrePendiente()) return;
  const refresco = await post('/api/v1/auth/refresh-token');
  // Sin refresco válido no queda sesión que cerrar
  if (refresco.status === 401) return;
  if (!refresco.ok) throw sinConexion();
  if (!hayCierrePendiente()) return;
  // Con la sesión recién rotada, solo un 2xx la da por cerrada
  if (!(await cierra()).ok) throw sinConexion();
};

/** Un envío a la vez entre pestañas, si el navegador lo permite. */
const conCandado = (fn) =>
  globalThis.navigator?.locks?.request
    ? globalThis.navigator.locks.request(CLAVE, fn)
    : fn();

const resuelve = async () => {
  // Dentro del candado se vuelve a mirar: otra pestaña pudo resolverlo
  if (!hayCierrePendiente()) return;
  if (!caducada()) await envia();
  olvidaElCierrePendiente();
};

let enVuelo = null;

/**
 * Manda el cierre pendiente, si lo hay. Varios a la vez comparten uno.
 * @throws {TypeError} Si no se pudo saber si el servidor cerró: la marca sigue
 */
export const mandaElCierrePendiente = () => {
  if (!hayCierrePendiente()) return Promise.resolve();
  if (!enVuelo) {
    enVuelo = conCandado(resuelve).finally(() => {
      enVuelo = null;
    });
  }
  return enVuelo;
};

/**
 * Antes de hablar con la API con las cookies de la sesión: si hay un cierre
 * pendiente, primero ese.
 * @throws {TypeError} Sin red: la petición no debe salir
 */
export const esperaAlCierrePendiente = () => mandaElCierrePendiente();
