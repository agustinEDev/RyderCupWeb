import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from './useAuthContext';
import { clearUserContext } from '../utils/sentryHelpers';
import { broadcastLogout } from '../utils/broadcastAuth';
import { logoutUseCase } from '../composition';

/**
 * Centralized logout hook
 * Handles all logout operations consistently across the application
 *
 * @returns {Object} - { logout: Function }
 */
/** Lo que se espera al backend antes de salir de todas formas. Cerrar la sesion
 *  de este lado no depende de que conteste: la cookie caduca sola, y quedarse
 *  dentro con los datos puestos es peor que salir sin que el servidor se entere. */
const ESPERA_MAXIMA_MS = 5_000;

export const useLogout = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuthContext();

  /**
   * Centralized logout function
   * Calls backend, clears state, and redirects to login
   *
   * La cabecera y el perfil tenian cada uno su copia de esto, y la del perfil
   * —que es la UNICA salida que hay en movil, porque alli la cabecera no tiene
   * menu (FE #306)— no limpiaba nada. De ahi FE #531: el nombre, el correo, el
   * handicap y las partidas guardadas se quedaban en el dispositivo. Una sola
   * salida para los tres sitios, para que no vuelva a arreglarse en uno solo.
   *
   * @param {Object} options - Logout options
   * @param {boolean} options.skipBackendCall - If true, skip backend logout call (useful when device already revoked)
   * @param {string|null} options.recargarEn - Destino de una salida con recarga
   *   completa. Sin esto se navega a `/login` como cliente.
   */
  const logout = useCallback(async ({ skipBackendCall = false, recargarEn = null } = {}) => {
    // A las demas pestañas primero: son las que no se enteran de nada
    broadcastLogout();

    if (!skipBackendCall) {
      try {
        // Con un tope: un rechazo se recoge abajo, pero una peticion COLGADA
        // —la cobertura de dos barras del campo— no se rechaza nunca, y sin
        // esto la limpieza no llegaba a ejecutarse y la salida se quedaba a
        // medias, con la pantalla puesta y los datos en el dispositivo
        await Promise.race([
          logoutUseCase.execute(),
          new Promise((suelta) => setTimeout(suelta, ESPERA_MAXIMA_MS)),
        ]);
      } catch {
        // Continue with client-side cleanup even if backend fails
      }
    }

    if (recargarEn) {
      // La navegacion se pide ANTES de tocar el estado. Limpiar reinicia la
      // consulta compartida, y sus suscriptores vuelven a preguntar por la
      // sesion en la ventana que queda hasta que la pagina se descarga: ese
      // `/current-user` responde 401 con la sesion recien cerrada, y el
      // interceptor intenta refrescar y acaba en el aviso de «sesion
      // caducada». Pedir la navegacion primero cierra esa ventana; la limpieza
      // de debajo es sincrona y se ejecuta igual, que asignar `href` no corta
      // el script
      window.location.href = recargarEn;
    }

    // Clear client-side state
    clearAuth();
    clearUserContext();

    if (!recargarEn) navigate('/login', { replace: true });
  }, [navigate, clearAuth]);

  return { logout };
};
