/**
 * El usuario de la sesión, leído de la consulta compartida (FE #489).
 *
 * Este hook hacia su propio `fetch` al montar, asi que **cada componente que lo
 * llamaba preguntaba por su cuenta** y lo llaman veinte ficheros: un arranque
 * pedia `/current-user` cuatro veces antes de que el panel pidiera su primer
 * dato. Ahora todos leen de `services/sesionCompartida`, que pregunta una sola
 * vez por carga de pagina.
 *
 * La forma que devuelve no cambia —`user`, `loading`, `error`, `refetch`—, que
 * es lo que permite no tocar a esos veinte ni a sus pruebas.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  consultaLaSesion,
  loQueHaySobreLaSesion,
  suscribeALaSesion,
} from '../services/sesionCompartida';

export const useAuth = () => {
  // `useSyncExternalStore` y no un `useState` con suscripcion a mano: es lo que
  // React ofrece para leer de algo que vive fuera, y evita que dos componentes
  // vean instantaneas distintas en el mismo render
  const estado = useSyncExternalStore(suscribeALaSesion, loQueHaySobreLaSesion);

  // Sin `[]`: tambien hay que volver a preguntar si el estado pasa a «no se sabe
  // nada» —lo que hace `olvidaLaSesion` al entrar o al salir— con este
  // componente ya montado. Con dependencias vacias, un `clearAuth` que no fuera
  // seguido de una navegacion dejaba a los guardias en «Cargando...» para
  // siempre. Hoy todas las salidas navegan, pero eso es suerte, no diseño.
  useEffect(() => {
    if (estado.resuelta) return;

    // La primera llamada dispara la consulta; las demas se enganchan a ella o
    // reciben lo que ya se sabe, sin tocar la red
    consultaLaSesion();
  }, [estado.resuelta]);

  const refetch = useCallback(() => consultaLaSesion({ forzar: true }), []);

  return {
    user: estado.user,
    loading: estado.cargando,
    error: estado.error,
    // Se esta enseñando algo que el servidor todavia no ha confirmado: la
    // sesion apuntada en el dispositivo, mientras se sigue preguntando por
    // detras (FE #529). Lo mira quien no pueda permitirse decidir con ella
    sinConfirmar: estado.refrescando && estado.user !== null,
    refetch,
  };
};

/**
 * La misma sesión, para lo que no es un componente —el contexto de usuario de
 * Sentry en `App.jsx`—. Antes abria su propia peticion.
 *
 * @returns {Promise<Object|null>} El usuario, o `null` si no hay sesión
 */
export const getUserData = async () => {
  await consultaLaSesion();

  // Lo que sepa el estado al final, y no lo que devuelva ESTA consulta: si otra
  // la adelanta —un login, un refresco forzado—, la superada resuelve a `null`,
  // y `App.jsx` lo lee como «no hay sesion». Se quedaba sin cierre por
  // inactividad, sin vigilancia de dispositivo revocado y sin refresco proactivo
  // el resto de la visita
  return loQueHaySobreLaSesion().user;
};

export default useAuth;
