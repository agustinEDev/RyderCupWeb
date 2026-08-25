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
 * Aquí la consulta vive una sola vez: quien llega mientras hay una en vuelo se
 * engancha a ella, quien llega después recibe lo que ya se sabe sin tocar la
 * red, y quien quiera enterarse de los cambios se suscribe.
 *
 * ## Lo que se aprendió montándolo
 *
 * - **Solo se guarda lo que dice el backend.** Sembrar esto con el usuario de
 *   `AuthContext` parecía gratis y no lo era: ahí vive una **entidad de dominio**
 *   —camelCase, con el correo como objeto— y quien lee de aquí espera el DTO en
 *   snake_case. El panel habría intentado pintar un objeto como texto, y un
 *   administrador recién entrado se habría quedado sin `is_admin`.
 * - **Un fallo no se guarda como respuesta.** Cachear «no hay sesión» tras un
 *   error de red dejaba el arranque sin cobertura en un ida y vuelta entre el
 *   guardia y el formulario, cada uno rebotando al otro sin volver a preguntar.
 * - **Refrescar no es cargar.** `ProtectedRoute` y `RoleGuard` desmontan a sus
 *   hijos mientras `loading` esté en alto: si `refetch` lo levantara, guardar el
 *   perfil desmontaría el formulario a media faena.
 * - **Una respuesta que llega tarde no manda.** Si entre la pregunta y la
 *   respuesta se cierra la sesión, la respuesta no puede resucitarla; por eso
 *   cada consulta lleva su número y solo escribe la que sigue siendo la actual.
 *
 * Lo que NO entra aquí, a propósito: la consulta de `useRedirectIfAuthenticated`.
 * Esa no puede pasar por `fetchWithTokenRefresh` —en una ruta pública el
 * interceptor se niega a refrescar ante un 401, que es justo el caso de la
 * aplicación abierta horas después— y lo documenta su propio fichero.
 */

import { isDeviceRevoked, handleDeviceRevocationLogout, clearDeviceRevocationFlag } from '../utils/deviceRevocationLogout';
import { fetchWithTokenRefresh } from '../utils/tokenRefreshInterceptor';

// Misma prioridad que el resto: la configuración de ejecución manda sobre la del
// build, o en un despliegue en contenedor se acaba preguntando a hosts distintos
const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

/** Lo que se espera antes de volver a intentarlo cuando la consulta falla. */
const ESPERA_TRAS_FALLO_MS = 3_000;

const NADA_SABIDO = { user: null, cargando: true, refrescando: false, error: null, resuelta: false };

let instantanea = NADA_SABIDO;
let enVuelo = null;
let generacion = 0;
let ultimoFallo = 0;
const oyentes = new Set();

/**
 * La instantánea es inmutable y se comparte tal cual: `useSyncExternalStore`
 * compara por identidad, y devolver un objeto nuevo en cada lectura dejaría la
 * aplicación repintando sin parar.
 */
const anota = (cambios) => {
  instantanea = { ...instantanea, ...cambios };
  for (const oyente of oyentes) oyente();
};

const pideAlBackend = async (miGeneracion) => {
  // Una respuesta de una consulta ya invalidada —porque entre medias se cerró la
  // sesión, o porque alguien forzó otra— no escribe nada
  const sigoValiendo = () => miGeneracion === generacion;

  try {
    const respuesta = await fetchWithTokenRefresh(`${API_URL}/api/v1/auth/current-user`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!sigoValiendo()) return null;

    if (!respuesta.ok) {
      if (respuesta.status === 401) {
        // Sin esto, el dispositivo revocado desde otro navegador se queda sin su
        // aviso y aterriza en el formulario sin saber por qué
        try {
          const datos = await respuesta.clone().json();
          if (isDeviceRevoked(respuesta, datos)) {
            handleDeviceRevocationLogout(datos);
            // Se deja resuelta y sin usuario aunque el manejador vaya a redirigir:
            // si no, los guardias se quedan en «Cargando...» hasta que la
            // redirección ocurra, y cada componente nuevo abre otra consulta
            if (sigoValiendo()) anota({ user: null, cargando: false, refrescando: false, error: null, resuelta: true });
            return null;
          }
        } catch {
          // El cuerpo no se pudo leer: se trata como un 401 corriente
        }
      }

      if (respuesta.status === 401 || respuesta.status === 404) {
        // Otra vez, y aqui hacia falta de verdad: entre el `clone().json()` de
        // arriba y esta linea hay un `await`, y en ese hueco cabe un login. Sin
        // comprobar, esta respuesta vieja escribia «resuelto y sin usuario»
        // encima de la sesion recien abierta y reabria el ida y vuelta al
        // formulario que cerro el commit anterior
        if (!sigoValiendo()) return null;

        anota({ user: null, cargando: false, refrescando: false, error: null, resuelta: true });
        return null;
      }

      throw new Error(`Failed to fetch user: ${respuesta.status}`);
    }

    const recibido = await respuesta.json();
    if (!sigoValiendo()) return null;

    // Si es la misma persona con los mismos datos se conserva el objeto de
    // antes. Media aplicacion depende del OBJETO —los cuatro cargadores del
    // panel llevan `[user]` en sus dependencias—, asi que uno nuevo con el mismo
    // contenido relanza las cuatro peticiones y sus esqueletos cada vez que se
    // revalida, es decir cada vez que se vuelve a la aplicacion
    const anterior = instantanea.user;
    const usuario = anterior && JSON.stringify(anterior) === JSON.stringify(recibido) ? anterior : recibido;

    clearDeviceRevocationFlag();
    anota({ user: usuario, cargando: false, refrescando: false, error: null, resuelta: true });

    return usuario;
  } catch (error) {
    console.error('Error loading user:', error);
    if (!sigoValiendo()) return null;

    // `resuelta` se queda como estaba: un tropiezo no es una respuesta, y
    // guardarlo como tal dejaba a quien montara despues sin volver a intentarlo
    ultimoFallo = Date.now();
    anota({ cargando: false, refrescando: false, error: error.message });

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
    // Con el backend caido, cada componente que montara abriria la suya: guardias
    // que redirigen, pantallas que se montan, y vuelta a empezar. Es el abanico
    // de peticiones que esto vino a quitar, justo cuando menos se aguanta
    if (ultimoFallo && Date.now() - ultimoFallo < ESPERA_TRAS_FALLO_MS) {
      return Promise.resolve(instantanea.user);
    }
  }

  generacion += 1;
  const mia = generacion;

  // Con un usuario ya sabido esto es un REFRESCO, y no puede levantar `cargando`:
  // los guardias desmontan a sus hijos mientras eso este en alto, asi que
  // guardar el perfil desmontaria el formulario a media faena
  anota(instantanea.user ? { refrescando: true, error: null } : { cargando: true, error: null });

  const promesa = pideAlBackend(mia).finally(() => {
    // Por identidad: con dos refrescos solapados, el primero en terminar borraba
    // la referencia del segundo y quien llegara despues no veia ninguno en vuelo
    if (enVuelo === promesa) enVuelo = null;
  });
  enVuelo = promesa;

  return promesa;
};

/**
 * La sesión se acabó: al salir, por inactividad o porque otra pestaña lo dijo.
 * Sin esto, lo que quedara guardado aquí sobreviviría al cierre de sesión.
 */
export const olvidaLaSesion = () => {
  // Sube la generación: si hay una respuesta en vuelo, ya no manda. Si no,
  // llegaría con el usuario de antes y volvería a dar por buena una sesión que
  // acaba de cerrarse
  generacion += 1;
  enVuelo = null;
  ultimoFallo = 0;
  // Vuelve al estado de partida, `cargando` incluido. Publicarlo con `cargando`
  // en falso le decía a los guardias «resuelto y sin usuario», y `ProtectedRoute`
  // rebotaba al formulario en su primer render —antes de que a nadie le diera
  // tiempo a preguntar—, justo despues de entrar. `resuelta` en falso porque se
  // olvida lo que se sabia, no se guarda un «aqui no hay sesion»
  anota(NADA_SABIDO);
};

/*
 * Aquí hubo una revalidación al volver a la aplicación, y se retiró.
 *
 * La idea era buena —la instalada vive días abierta y el refresco dura siete, así
 * que la pantalla puede estar enseñando una sesión que el backend ya rechazó—,
 * pero el precio no lo era: esa consulta pasa por `fetchWithTokenRefresh` con un
 * access caducado, así que intenta refrescar, y si ese refresco falla **sin
 * respuesta** —un corte a media petición, un tiempo agotado— el interceptor no
 * lo distingue de una sesión muerta y cierra sesión con una redirección dura.
 *
 * Es decir: volver a la aplicación con mala cobertura podía echar a alguien de
 * la pantalla de anotación en mitad de una vuelta. Anotar sin conexión es el caso
 * de uso de esta aplicación, no un extra, así que la sesión rancia es el menor de
 * los dos males: cualquier llamada que falle con un 401 ya dispara ese camino
 * cuando toca, y antes de todo esto tampoco se revalidaba.
 */

/** Solo para las pruebas: esto vive en el módulo y sobrevive de una a otra. */
export const reiniciaLaSesionCompartida = () => {
  generacion += 1;
  enVuelo = null;
  ultimoFallo = 0;
  instantanea = NADA_SABIDO;
  // Los oyentes NO se tocan: darlos de baja aquí dejaría a los componentes
  // montados sin enterarse de nada mas, sin que nada lo delatara
};
