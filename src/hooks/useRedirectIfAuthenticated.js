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
 *    del interceptor —justo lo que reintroduciría el bucle.
 *
 * Cuando no hay nada guardado no se toca la red: el visitante anónimo, que es
 * el caso común, ve el formulario de inmediato.
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuthContext } from './useAuthContext';
import { refreshAccessToken } from '../utils/tokenRefreshInterceptor';

const API_URL = import.meta.env.VITE_API_BASE_URL || '';

const requestCurrentUser = () =>
  fetch(`${API_URL}/api/v1/auth/current-user`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Mismo criterio que el login manual: se respeta el origen de la navegación
 * solo si es una ruta interna, para no convertirlo en un Open Redirect
 * (CWE-601). `//evil.com` es una URL protocol-relative, no una ruta.
 */
const resolveTarget = (requestedPath) =>
  requestedPath && requestedPath.startsWith('/') && !requestedPath.startsWith('//')
    ? requestedPath
    : '/dashboard';

/**
 * @returns {boolean} `true` mientras se resuelve la sesión: el formulario no
 *   debe pintarse todavía o parpadea antes de la redirección.
 */
export const useRedirectIfAuthenticated = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, clearAuth } = useAuthContext();

  // Se congela el valor del primer render. Después del login `user` cambia, y
  // sin esto el efecto volvería a dispararse sobre una página que ya se va.
  const [hadStoredUser] = useState(() => Boolean(user));
  const [isChecking, setIsChecking] = useState(hadStoredUser);

  useEffect(() => {
    if (!hadStoredUser) return undefined;

    let cancelled = false;

    const verifySession = async () => {
      try {
        let response = await requestCurrentUser();

        // El access caduca a los 15 minutos; que esté caducado no dice nada
        // sobre la sesión, solo que toca renovarlo
        if (response.status === 401) {
          await refreshAccessToken();
          response = await requestCurrentUser();
        }

        if (!response.ok) {
          throw new Error(`current-user respondió ${response.status}`);
        }

        const currentUser = await response.json();
        if (cancelled) return;

        setUser(currentUser);
        navigate(resolveTarget(location.state?.from?.pathname), { replace: true });
        // `isChecking` se queda arriba a propósito: la página se está yendo y
        // bajarlo pintaría el formulario un instante
        return;
      } catch {
        if (cancelled) return;
        // La sesión no se puede recuperar, así que el `user` guardado es resto
        // de otra anterior: se tira, o cada montaje repite el viaje a la red
        clearAuth();
      }

      setIsChecking(false);
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [hadStoredUser, navigate, location.state, setUser, clearAuth]);

  return isChecking;
};

export default useRedirectIfAuthenticated;
