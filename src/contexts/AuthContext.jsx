/**
 * Authentication Context
 * Manages user authentication state and CSRF token for v1.13.0 security features
 *
 * @see docs/FRONTEND_INTEGRATION_v1.13.0.md - CSRF Protection section
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setCsrfTokenGlobal } from './csrfTokenSync';
import { olvidaLaSesion } from '../services/sesionCompartida';

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
    if (userData) {
      // Y NO se siembra con esto la consulta compartida, aunque ahorraria un
      // viaje: aqui llega una **entidad de dominio** —camelCase, con el correo
      // como objeto— y quien lee de `useAuth` espera el DTO del backend en
      // snake_case. El panel habria intentado pintar un objeto como texto y un
      // administrador recien entrado se habria quedado sin `is_admin` (FE #489)
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      olvidaLaSesion();
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
    // que ya no esta (FE #489). Todos los caminos de salida pasan por aqui:
    // el boton, la inactividad, el aviso de otra pestaña y el dispositivo
    // revocado
    olvidaLaSesion();
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
