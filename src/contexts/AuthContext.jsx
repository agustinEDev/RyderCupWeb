/**
 * Authentication Context
 * Manages user authentication state and CSRF token for v1.13.0 security features
 *
 * @see docs/FRONTEND_INTEGRATION_v1.13.0.md - CSRF Protection section
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';

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

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Custom hook to access auth context
 * @returns {Object} Auth context value
 * @throws {Error} If used outside AuthProvider
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

/**
 * Get current CSRF token (synchronous)
 * Used by api.js interceptor to add X-CSRF-Token header
 *
 * NOTE: This is a workaround to access context outside React components.
 * A better approach would be to use axios interceptors with a closure,
 * but this works with our current fetch-based implementation.
 *
 * @returns {string|null} Current CSRF token or null
 */
let currentCsrfToken = null;

export const getCsrfToken = () => currentCsrfToken;

export const setCsrfTokenGlobal = (token) => {
  currentCsrfToken = token;
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

AuthProviderWithGlobalSync.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Internal component to sync CSRF token to global variable
 */
const CsrfTokenSyncWrapper = ({ children }) => {
  const { csrfToken } = useAuthContext();

  useEffect(() => {
    setCsrfTokenGlobal(csrfToken);
  }, [csrfToken]);

  return children;
};

CsrfTokenSyncWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
