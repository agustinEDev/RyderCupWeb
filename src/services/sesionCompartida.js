/**
 * La sesión, consultada UNA vez por carga de página (FE #489).
 *
 * `useAuth` era un hook plano —`useState` más un `fetch` al montar—, así que
 * **cada componente que lo llamaba preguntaba por su cuenta**, y lo llaman veinte
 * ficheros. Un arranque de la aplicación instalada pedía `/current-user` cuatro
 * veces —el contexto de Sentry, la pantalla de entrada, el guardia de rutas y el
 * propio panel— antes de que el panel pidiera su primer dato, y las dos últimas
 * en serie: el guardia no pinta nada hasta que la suya vuelve, y solo entonces
 * monta el panel, que arranca la suya.
 *
 * Aquí la consulta vive una sola vez:
 *
 * - Si hay una **en vuelo**, quien llegue se engancha a ella en vez de abrir otra.
 * - Si ya está **resuelta**, se devuelve lo que se sabe sin tocar la red.
 * - Quien quiera saber cuándo cambia, **se suscribe**.
 *
 * Efecto de propina: a partir de la primera respuesta, un componente que monte
 * después ya nace con el usuario puesto en vez de con `loading` en alto. Eso
 * arregla de paso lo que costó una ronda entera en FE #485 —el panel se daba por
 * cargado en el render en que llegaba el usuario, con las peticiones sin salir—.
 *
 * Lo que NO entra aquí, a propósito: la consulta de `useRedirectIfAuthenticated`.
 * Esa no puede pasar por `fetchWithTokenRefresh` —en una ruta pública el
 * interceptor se niega a refrescar ante un 401, que es justo el caso de la
 * aplicación abierta horas después— y lo documenta su propio fichero. Compartirla
 * es otra conversación; esta issue quita las tres que sí son la misma.
 */

import { isDeviceRevoked, handleDeviceRevocationLogout, clearDeviceRevocationFlag } from '../utils/deviceRevocationLogout';
import { fetchWithTokenRefresh } from '../utils/tokenRefreshInterceptor';

// Misma prioridad que el resto: la configuración de ejecución manda sobre la del
// build, o en un despliegue en contenedor se acaba preguntando a hosts distintos
const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

const SIN_RESOLVER = { user: null, cargando: true, error: null, resuelta: false };

let instantanea = SIN_RESOLVER;
let enVuelo = null;
const oyentes = new Set();

/**
 * La instantánea es inmutable y se comparte tal cual: `useSyncExternalStore`
 * compara por identidad, y devolver un objeto nuevo en cada lectura lo dejaría
 * repintando sin parar.
 */
const anota = (cambios) => {
  instantanea = { ...instantanea, ...cambios };
  for (const oyente of oyentes) oyente();
};

const pideAlBackend = async () => {
  try {
    const respuesta = await fetchWithTokenRefresh(`${API_URL}/api/v1/auth/current-user`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!respuesta.ok) {
      if (respuesta.status === 401) {
        // Sin esto, el dispositivo revocado desde otro navegador se queda sin su
        // aviso y aterriza en el formulario sin saber por qué
        try {
          const datos = await respuesta.clone().json();
          if (isDeviceRevoked(respuesta, datos)) {
            handleDeviceRevocationLogout(datos);
            return null; // el propio manejador redirige
          }
        } catch {
          // El cuerpo no se pudo leer: se trata como un 401 corriente
        }
      }

      if (respuesta.status === 401 || respuesta.status === 404) {
        anota({ user: null, cargando: false, error: null, resuelta: true });
        return null;
      }

      throw new Error(`Failed to fetch user: ${respuesta.status}`);
    }

    const usuario = await respuesta.json();
    clearDeviceRevocationFlag();
    anota({ user: usuario, cargando: false, error: null, resuelta: true });

    return usuario;
  } catch (error) {
    console.error('Error loading user:', error);
    anota({ user: null, cargando: false, error: error.message, resuelta: true });

    return null;
  }
};

/** Lo que se sabe ahora mismo, sin tocar la red. */
export const loQueHaySobreLaSesion = () => instantanea;

/** @returns {() => void} La baja. */
export const suscribeALaSesion = (oyente) => {
  oyentes.add(oyente);

  return () => oyentes.delete(oyente);
};

/**
 * @param {{forzar?: boolean}} opciones `forzar` vuelve a preguntar aunque ya se
 *   sepa: es lo que hace `refetch` tras guardar algo del perfil.
 */
export const consultaLaSesion = ({ forzar = false } = {}) => {
  if (!forzar) {
    if (instantanea.resuelta) return Promise.resolve(instantanea.user);
    if (enVuelo) return enVuelo;
  }

  if (!instantanea.cargando) anota({ cargando: true, error: null });

  enVuelo = pideAlBackend().finally(() => {
    enVuelo = null;
  });

  return enVuelo;
};

/**
 * La sesión se acabó: al salir, por inactividad o porque otra pestaña lo dijo.
 * Sin esto, lo que quedara guardado aquí sobreviviría al logout.
 */
export const olvidaLaSesion = () => {
  enVuelo = null;
  // `resuelta` en falso: se olvida lo que se sabia, no se guarda un «aqui no hay
  // sesion». Guardarlo ahorraria una peticion y se quedaria rancio en cuanto la
  // sesion vuelva por otro lado —otra pestaña entrando, que este proyecto
  // sincroniza por Broadcast Channel—. `cargando` en falso para no dejar
  // esperando a nadie mientras nadie pregunte.
  anota({ user: null, cargando: false, error: null, resuelta: false });
};

/** Acaba de entrar alguien: se anota sin gastar otra consulta. */
export const anotaLaSesion = (usuario) => {
  enVuelo = null;
  anota({ user: usuario, cargando: false, error: null, resuelta: true });
};

/** Solo para las pruebas: esto vive en el módulo y sobrevive de una a otra. */
export const reiniciaLaSesionCompartida = () => {
  enVuelo = null;
  oyentes.clear();
  instantanea = SIN_RESOLVER;
};
