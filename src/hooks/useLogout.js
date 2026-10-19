import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from './useAuthContext';
import { clearUserContext } from '../utils/sentryHelpers';
import { broadcastLogout } from '../utils/broadcastAuth';
import { logoutUseCase } from '../composition';
import { laPaginaSeVa } from '../services/sesionCompartida';

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
   * @param {boolean} options.desdeOtraPestana - El cierre llega de otra pestaña: sin avisar ni llamar
   *   al backend, y recargando a `/login` (la navegación pedida antes de limpiar)
   */
  const logout = useCallback(async ({ skipBackendCall = false, recargarEn: destino = null, desdeOtraPestana = false } = {}) => {
    // El cierre llega de otra pestaña: ni se avisa (avisar de vuelta era un
    // eco sin fin, con miles de POST /auth/logout) ni se llama al backend
    // (comparten cookies y ya lo hizo ella), y se sale RECARGANDO: limpiar sin
    // haber pedido la navegación hacía volver a preguntar por la sesión, y un
    // 200 reescribía los datos de quien salía o un 401 acababa en «sesión
    // caducada» (FE #865, /code-review)
    const recargarEn = desdeOtraPestana ? '/login' : destino;

    // A las demas pestañas primero: son las que no se enteran de nada, y así
    // lo saben aunque esta se cierre mientras espera al servidor
    if (!desdeOtraPestana) broadcastLogout();

    if (!skipBackendCall && !desdeOtraPestana) {
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
      // Y la consulta de la sesión ya no pregunta: limpiar la devuelve a «no se
      // sabe» y volvía a pedir /current-user, que la recarga cortaba a medias
      // (FE #865)
      laPaginaSeVa();
    }

    // Clear client-side state
    clearAuth();
    clearUserContext();

    if (!recargarEn) navigate('/login', { replace: true });
  }, [navigate, clearAuth]);

  return { logout };
};
