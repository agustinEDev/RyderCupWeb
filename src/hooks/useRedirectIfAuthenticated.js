/**
 * Saca del formulario a quien ya tiene sesión (FE #305).
 *
 * Lo delicado no es redirigir, son las dos trampas que rodean a la decisión:
 *
 * 1. **No basta con el `user` de `AuthContext`.** Se hidrata de `localStorage`
 *    y sobrevive a las cookies: redirigir con él manda al `/dashboard` a quien
 *    ya no tiene sesión, `ProtectedRoute` lo devuelve a `/login`, y como el
 *    `user` guardado sigue ahí, otra vez. Es el bucle que documenta `App.jsx`.
 *    Por eso solo se redirige tras confirmarlo contra el backend.
 *
 * 2. **Aquí no vale `fetchWithTokenRefresh`.** En una página pública se niega a
 *    refrescar ante un 401 de `/current-user` (`tokenRefreshInterceptor.js`),
 *    que es exactamente el caso de esta issue: la PWA abierta desde el icono
 *    horas después, con el access de 15 minutos caducado y el refresh vivo. Con
 *    esa negativa el usuario vería el formulario teniendo sesión renovable. Se
 *    pide el refresco a mano, que además no arrastra el logout ni la redirección
 *    del interceptor —justo lo que reintroduciría el bucle—, a cambio de tener
 *    que mirar aquí la revocación de dispositivo que el interceptor sí atiende.
 *
 * Cuando no hay nada guardado no se toca la red: el visitante anónimo, que es
 * el caso común, ve el formulario de inmediato.
 *
 * Nota sobre `StrictMode`: en desarrollo el efecto se monta dos veces y salen
 * dos peticiones. No se pone un `ref` que lo corte porque la limpieza del primer
 * montaje descarta su propia respuesta, y el candado dejaría la segunda sin
 * ejecutar: nunca se resolvería nada. En producción no hay doble montaje.
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuthContext } from './useAuthContext';
import { refreshAccessToken } from '../utils/tokenRefreshInterceptor';
import { isDeviceRevoked, handleDeviceRevocationLogout } from '../utils/deviceRevocationLogout';
// El mismo guard que usa el login manual. Compartirlo es lo que importa: dos
// copias de una comprobación de seguridad acaban divergiendo
import { resolvePostAuthTarget } from '../utils/auth';
import { anotaLaSesion } from '../services/sesionCompartida';
import User from '../domain/entities/User.js';

// Misma prioridad que `api.js` y el interceptor: la configuración de ejecución
// manda sobre la del build. Sin esto, `/current-user` y el refresco de aquí
// abajo pueden acabar apuntando a hosts distintos en un despliegue en contenedor
const API_URL = globalThis.APP_CONFIG?.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

/**
 * Más allá de esto se enseña el formulario. Una instancia fría o una red mala no
 * pueden dejar la pantalla de acceso inalcanzable detrás de un "Cargando...".
 */
const SESSION_CHECK_TIMEOUT_MS = 5000;

const requestCurrentUser = (signal) =>
  fetch(`${API_URL}/api/v1/auth/current-user`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

/** El backend ha contestado que no: la sesión está muerta, no es un tropiezo. */
class SessionRejectedError extends Error {}

const isSessionRejected = (error) =>
  error instanceof SessionRejectedError || error?.response?.status === 401;

/**
 * @returns {boolean} `true` mientras se resuelve la sesión: el formulario no
 *   debe pintarse todavía o parpadea antes de la redirección.
 */
export const useRedirectIfAuthenticated = ({
  enabled = true,
  entrarSinRed = false,
} = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, clearAuth } = useAuthContext();

  // `enabled` para quien solo quiere esto en algunos casos —la portada, que
  // redirige al panel si se abre desde el icono de la aplicación pero no en el
  // navegador—. Va como parámetro y no como un `if` en quien llama porque un
  // hook no se puede llamar condicionalmente.
  //
  // Se congela el valor del primer render. Después del login `user` cambia, y
  // sin esto el efecto volvería a dispararse sobre una página que ya se va.
  const [hadStoredUser] = useState(() => enabled && Boolean(user));
  const [isChecking, setIsChecking] = useState(hadStoredUser);

  useEffect(() => {
    if (!hadStoredUser) return undefined;

    let cancelled = false;
    let settled = false;
    const controller = new AbortController();

    let deadline;

    const showForm = () => {
      settled = true;
      clearTimeout(deadline);
      setIsChecking(false);
    };

    deadline = setTimeout(() => {
      if (cancelled || settled) return;
      // Se abandona la comprobación, pero NO se toca el usuario guardado: no
      // sabemos nada de la sesión, solo que el backend no contestó a tiempo
      controller.abort();

      if (entrarSinRed) {
        // Este es el camino de VERDAD sin cobertura: la petición no falla
        // rápido, se queda colgada hasta agotar el plazo. Tratarlo distinto del
        // rechazo de red dejaba el arreglo cubriendo solo el caso raro.
        settled = true;
        navigate(resolvePostAuthTarget(location.state?.from?.pathname), { replace: true });
        return;
      }

      showForm();
    }, SESSION_CHECK_TIMEOUT_MS);

    const verifySession = async () => {
      try {
        let response = await requestCurrentUser(controller.signal);

        if (response.status === 401) {
          const errorData = await response
            .clone()
            .json()
            .catch(() => ({}));

          // Sin esto el dispositivo revocado desde otro navegador aterriza en un
          // formulario pelado, sin el aviso que da el interceptor
          if (isDeviceRevoked(response, errorData)) {
            handleDeviceRevocationLogout(errorData);
            if (cancelled || settled) return;
            clearAuth();
            showForm();
            return;
          }

          // El access caduca a los 15 minutos; que esté caducado no dice nada
          // sobre la sesión, solo que toca renovarlo
          await refreshAccessToken();
          response = await requestCurrentUser(controller.signal);
        }

        if (response.status === 401) {
          throw new SessionRejectedError('La sesión ya no vale');
        }

        if (!response.ok) {
          throw new Error(`current-user respondió ${response.status}`);
        }

        const datosDelBackend = await response.json();
        const currentUser = new User(datosDelBackend);
        if (cancelled || settled) return;

        settled = true;
        clearTimeout(deadline);
        setUser(currentUser);
        // DESPUES de `setUser`, y el orden importa: `setUser` invalida la
        // consulta compartida —tiene que hacerlo, o un 401 guardado de antes
        // sobrevive al login y deja al guardia mandando al formulario en
        // bucle—, asi que sembrar antes no serviria de nada.
        //
        // Y se siembra con el DTO, no con la entidad: acabamos de preguntar y
        // el backend ha dicho que si, de modo que el destino no tiene por que
        // volver a preguntarlo. Sin esto, `ProtectedRoute` pintaba su espera
        // gris a pantalla completa en cada arranque con sesion (FE #489)
        anotaLaSesion(datosDelBackend);
        navigate(resolvePostAuthTarget(location.state?.from?.pathname), { replace: true });
        // `isChecking` se queda arriba a propósito: la página se está yendo y
        // bajarlo pintaría el formulario un instante
      } catch (error) {
        if (cancelled || settled) return;

        if (isSessionRejected(error)) {
          // Ahora sí: el `user` guardado es resto de una sesión anterior y se
          // tira, o cada montaje repite el viaje a la red
          clearAuth();
        } else {
          // Caída, corte de red o respuesta rara. El usuario guardado se queda
          // donde está: borrarlo por un tropiezo inutilizaría esta redirección
          // durante los 7 días que al refresh token le quedan de vida
          console.warn('[auth] no se pudo comprobar la sesión:', error);

          if (entrarSinRed) {
            // Quien arranca la aplicación instalada en el campo, sin cobertura,
            // no puede quedarse ante un formulario que no hay forma de enviar:
            // anotar sin conexión es el caso de uso, no un extra. La sesión no
            // se ha rechazado —solo no se ha podido preguntar—, así que se entra
            // con la que hay guardada.
            navigate(resolvePostAuthTarget(location.state?.from?.pathname), { replace: true });
            return;
          }
        }

        showForm();
      }
    };

    verifySession();

    return () => {
      cancelled = true;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [hadStoredUser, navigate, location.state, setUser, clearAuth, entrarSinRed]);

  return isChecking;
};

export default useRedirectIfAuthenticated;
