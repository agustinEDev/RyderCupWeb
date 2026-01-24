/**
 * Authentication Context
 * Manages user authentication state and CSRF token for v1.13.0 security features
 *
 * @see docs/FRONTEND_INTEGRATION_v1.13.0.md - CSRF Protection section
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setCsrfTokenGlobal } from './csrfTokenSync';

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
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize auth state from localStorage (legacy compatibility)
   * TODO: Remove localStorage dependency in future versions (use only httpOnly cookies)
   */
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setIsInitialized(true);
  }, []);

  /**
   * Update user state
   * @param {Object} userData - User data from backend
   */
  const setUserData = useCallback((userData) => {
    setUser(userData);
    if (userData) {
      // Keep localStorage sync for legacy compatibility
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
