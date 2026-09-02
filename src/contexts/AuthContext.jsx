/**
 * Authentication Context
 * Manages user authentication state and CSRF token for v1.13.0 security features
 *
 * @see docs/FRONTEND_INTEGRATION_v1.13.0.md - CSRF Protection section
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setCsrfTokenGlobal } from './csrfTokenSync';
import { olvidaLaSesion } from '../services/sesionCompartida';
import { olvidaLasAccionesPendientes } from '../services/accionesPendientes';
import { olvidaLoDeEstaCuenta } from '../services/loUltimoConocido';

// Create the context
const AuthContext = createContext(null);

/**
 * AuthProvider component
 * Wraps the application to provide authentication state globally
 *
 * State managed:
 * - user: Current authenticated user (null if not authenticated)
 * - csrfToken: CSRF token from backend (required for POST/PUT/PATCH/DELETE)
 */
export const AuthProvider = ({ children }) => {
  /**
   * Initialize user from localStorage using lazy initializer
   * This avoids calling setState in useEffect (better performance + no lint warning)
   */
  const [user, setUser] = useState(() => {
    // Guard for SSR and environments without localStorage
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      // Safe cleanup: only remove if localStorage is available
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('user');
      }
    }
    return null;
  });

  const [csrfToken, setCsrfToken] = useState(null);
  const [isInitialized] = useState(true); // Always true since we use lazy initializer

  /**
   * Update user state
   * @param {Object} userData - User data from backend
   */
  const setUserData = useCallback((userData) => {
    setUser(userData);
    // Entrar o salir INVALIDAN la consulta compartida, las dos (FE #489). Al
    // entrar no se siembra con esto aunque ahorraria un viaje: aqui llega una
    // **entidad de dominio** —camelCase, con el correo como objeto— y quien lee
    // de `useAuth` espera el DTO del backend en snake_case.
    //
    // Y no basta con invalidar al salir: si antes hubo un 401 —un enlace publico
    // abierto sin sesion basta— quedaba guardado como «no hay usuario», y al
    // entrar sin recargar el guardia leia eso y devolvia al formulario, que
    // confirmaba la sesion y volvia a mandar al destino. Un ida y vuelta sin fin
    // que solo cortaba una recarga.
    olvidaLaSesion();

    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  /**
   * Update CSRF token
   * Called after login and token refresh
   * @param {string} token - New CSRF token from backend
   */
  const updateCsrfToken = useCallback((token) => {
    setCsrfToken(token);
  }, []);

  /**
   * Clear authentication state
   * Called on logout or session expiration
   */
  const clearAuth = useCallback(() => {
    setUser(null);
    setCsrfToken(null);
    // Sin esto, lo que la consulta compartida tuviera guardado sobreviviria al
    // cierre de sesion y el siguiente componente que montara veria un usuario
    // que ya no esta (FE #489).
    //
    // Por aqui pasan la inactividad, el aviso de otra pestaña y —desde FE
    // #531— el boton de salir, que antes se limpiaba a medias: hacia su
    // peticion y redirigia, y el almacenamiento se quedaba entero.
    //
    // Los dos cierres duros NO pasan: `handleDeviceRevocationLogout` y
    // `handleCsrfLogout` limpian a mano y salen con `window.location.href`, y
    // esa recarga se lleva por delante el estado del modulo. Lo que la recarga
    // NO se lleva es el almacenamiento, asi que lo que viva ahi hay que
    // borrarlo en los tres sitios. Si algun dia esas salidas pasan a ser
    // navegacion de cliente, tendran que invalidar tambien
    olvidaLaSesion();
    // Y lo que el panel llegara a enseñar: son datos de ESTA cuenta, y asomarian
    // un instante en la siguiente que entrara sin recargar (FE #502)
    olvidaLasAccionesPendientes();
    // Y las partidas guardadas para poder anotar sin cobertura (FE #524): en un
    // móvil compartido, la siguiente persona que entrara y se quedara sin señal
    // vería la lista de la anterior, con sus nombres y sus resultados
    olvidaLoDeEstaCuenta();
    // Los avisos de golpes que no se pudieron guardar NO se tocan, ni aquí ni
    // en los cierres duros. Se intentó borrarlos y es un error: no se pueden
    // regenerar —el golpe que describen ya salió de la cola al escribirlos— y
    // el borrado llega a dispararse DENTRO del propio vaciado, porque un 403
    // de CSRF cierra la sesión desde `api.js` en mitad del bucle y se lleva
    // avisos escritos milisegundos antes. La privacidad ya está resuelta sin
    // borrar nada: `golpesPerdidos.pendientes(userId)` solo devuelve los de
    // quien mira, así que la siguiente persona del móvil no los ve (FE #521)
    localStorage.removeItem('user');
    localStorage.removeItem('access_token'); // Legacy cleanup
  }, []);

  const value = {
    user,
    csrfToken,
    isInitialized,
    setUser: setUserData,
    updateCsrfToken,
    clearAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Enhanced AuthProvider that syncs CSRF token to global variable
 * This allows api.js to access the token synchronously
 */
export const AuthProviderWithGlobalSync = ({ children }) => {
  return (
    <AuthProvider>
      <CsrfTokenSyncWrapper>{children}</CsrfTokenSyncWrapper>
    </AuthProvider>
  );
};

/**
 * Internal component to sync CSRF token to global variable
 */
const CsrfTokenSyncWrapper = ({ children }) => {
  const { csrfToken } = useContext(AuthContext);

  useEffect(() => {
    setCsrfTokenGlobal(csrfToken);
  }, [csrfToken]);

  return children;
};

export default AuthContext;
