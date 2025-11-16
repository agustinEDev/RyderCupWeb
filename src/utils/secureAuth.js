/**
 * Secure Authentication Utilities
 *
 * SECURITY NOTE: This is an interim solution using sessionStorage.
 * The recommended approach is httpOnly cookies set by the backend.
 * See SECURITY_MIGRATION.md for full migration guide.
 *
 * sessionStorage is better than localStorage because:
 * - Cleared when tab/browser closes
 * - Not shared across tabs (isolated)
 * - Still vulnerable to XSS (like localStorage) but shorter lifetime
 *
 * TODO: Migrate to httpOnly cookies when backend supports it
 */

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

/**
 * Store authentication token
 * TEMPORARY: Uses sessionStorage until httpOnly cookies are implemented
 * @param {string} token - JWT token
 */
export const setAuthToken = (token) => {
  if (!token || typeof token !== 'string') {
    console.error('Invalid token provided');
    return;
  }
  // Use sessionStorage instead of localStorage (cleared on tab close)
  sessionStorage.setItem(TOKEN_KEY, token);
};

/**
 * Get authentication token
 * @returns {string|null} - Token or null
 */
export const getAuthToken = () => {
  return sessionStorage.getItem(TOKEN_KEY);
};

/**
 * Remove authentication token
 */
export const removeAuthToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
};

/**
 * Store user data (non-sensitive only)
 * @param {Object} user - User object
 */
export const setUserData = (user) => {
  if (!user || typeof user !== 'object') {
    console.error('Invalid user data provided');
    return;
  }

  // Only store non-sensitive data
  const safeUserData = {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    email_verified: user.email_verified,
    handicap: user.handicap,
    handicap_updated_at: user.handicap_updated_at,
    created_at: user.created_at,
    updated_at: user.updated_at
  };

  sessionStorage.setItem(USER_KEY, JSON.stringify(safeUserData));
};

/**
 * Get user data
 * @returns {Object|null} - User object or null
 */
export const getUserData = () => {
  try {
    const data = sessionStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

/**
 * Remove user data
 */
export const removeUserData = () => {
  sessionStorage.removeItem(USER_KEY);
};

/**
 * Clear all auth data
 */
export const clearAuthData = () => {
  removeAuthToken();
  removeUserData();
};

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;

  // Validate token expiration
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    if (!payload.exp || !Number.isFinite(Number(payload.exp))) {
      clearAuthData();
      return false;
    }

    // Check if expired (with 30s buffer)
    const isExpired = payload.exp * 1000 < (Date.now() + 30000);
    if (isExpired) {
      clearAuthData();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    clearAuthData();
    return false;
  }
};

/**
 * Make authenticated API call
 * TODO: When backend supports httpOnly cookies, remove Authorization header
 * and use credentials: 'include' only
 *
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export const authenticatedFetch = async (url, options = {}) => {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // INTERIM: Add Authorization header
  // TODO: Remove this when backend uses httpOnly cookies
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
    // FUTURE: When backend supports cookies, use this:
    // credentials: 'include',
  });
};

/**
 * Logout user
 * TODO: Call backend /logout endpoint when implemented
 */
export const logout = async () => {
  // FUTURE: Call backend logout endpoint to clear httpOnly cookie
  // await fetch(`${API_URL}/api/v1/auth/logout`, {
  //   method: 'POST',
  //   credentials: 'include'
  // });

  clearAuthData();
};

/**
 * Migrate from localStorage to sessionStorage
 * Call this on app initialization to migrate existing users
 */
export const migrateFromLocalStorage = () => {
  // Check if data exists in localStorage
  const localToken = localStorage.getItem('access_token');
  const localUser = localStorage.getItem('user');

  if (localToken || localUser) {
    console.warn('Migrating auth data from localStorage to sessionStorage');

    // Move to sessionStorage
    if (localToken) {
      setAuthToken(localToken);
      localStorage.removeItem('access_token');
    }

    if (localUser) {
      try {
        const userData = JSON.parse(localUser);
        setUserData(userData);
      } catch (error) {
        console.error('Error migrating user data:', error);
      }
      localStorage.removeItem('user');
    }

    console.info('Migration complete. Auth data now in sessionStorage (cleared on tab close)');
  }
};
