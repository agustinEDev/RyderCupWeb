/**
 * El cierre de sesión que no llegó al servidor (auditoría de la fase 6, F-01).
 *
 * Las cookies de la sesión son httpOnly: solo el servidor las borra. Si alguien
 * cierra la sesión sin cobertura, la app queda «fuera» pero la sesión sigue viva
 * en el móvil, y quien lo abra después entra en su cuenta. Por eso `useLogout`
 * apunta aquí una marca ANTES de llamar al servidor y la borra cuando confirma;
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
 *   ya estaba muerta.
 * - Sin red, sin respuesta a tiempo o un 5xx: no se sabe si cerró; la marca sigue.
 * - Otra respuesta del servidor: se da por cerrada. Quedarse con la marca dejaría
 *   la app sin poder hablar con la API para siempre.
 */
import { getCsrfCookie } from './csrfTokenSync';
import { cabeceraDelModoDeLaApp } from '../../utils/modoDeLaApp';

const CLAVE = 'rydercup-cierre-pendiente';
const TOPE_MS = 10_000;

const API_URL =
  globalThis.APP_CONFIG?.API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '';

/** El usuario pidió cerrar la sesión: hasta que el servidor confirme, queda pendiente. */
export const apuntaElCierrePendiente = () => {
  try {
    globalThis.localStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // Sin almacenamiento no hay marca; el cierre se intenta igual
  }
};

/** Si hay un cierre de sesión que el servidor no ha confirmado. */
export const hayCierrePendiente = () => {
  try {
    return globalThis.localStorage.getItem(CLAVE) !== null;
  } catch {
    return false;
  }
};

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

/** Un POST con tope de tiempo; sin red o sin respuesta a tiempo, `TypeError`. */
const post = async (ruta, cabeceras = {}) => {
  const corte = new AbortController();
  const temporizador = setTimeout(() => corte.abort(), TOPE_MS);
  try {
    return await fetch(`${API_URL}${ruta}`, {
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

/** 2xx o 401 dicen algo de la sesión; un 5xx, no. */
const noSeSabe = (respuesta) => respuesta.status >= 500;

const envia = async () => {
  let respuesta = await cierra();
  if (respuesta.status === 401) {
    const refresco = await post('/api/v1/auth/refresh-token');
    // Sin refresco válido no queda sesión que cerrar
    if (refresco.status === 401) return;
    if (noSeSabe(refresco)) throw sinConexion();
    respuesta = await cierra();
  }
  if (noSeSabe(respuesta)) throw sinConexion();
};

let enVuelo = null;

/**
 * Manda el cierre pendiente, si lo hay. Varios a la vez comparten uno.
 * @throws {TypeError} Si no se pudo saber si el servidor cerró: la marca sigue
 */
export const mandaElCierrePendiente = () => {
  if (!hayCierrePendiente()) return Promise.resolve();
  if (!enVuelo) {
    enVuelo = envia()
      .then(olvidaElCierrePendiente)
      .finally(() => {
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
