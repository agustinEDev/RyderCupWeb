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

  useEffect(() => {
    // La primera llamada dispara la consulta; las demas se enganchan a ella o
    // reciben lo que ya se sabe, sin tocar la red
    consultaLaSesion();
  }, []);

  const refetch = useCallback(() => consultaLaSesion({ forzar: true }), []);

  return {
    user: estado.user,
    loading: estado.cargando,
    error: estado.error,
    refetch,
  };
};

/**
 * La misma sesión, para lo que no es un componente —el contexto de usuario de
 * Sentry en `App.jsx`—. Antes abria su propia peticion.
 *
 * @returns {Promise<Object|null>} El usuario, o `null` si no hay sesión
 */
export const getUserData = () => consultaLaSesion();

export default useAuth;
