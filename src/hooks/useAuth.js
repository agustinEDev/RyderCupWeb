/**
 * Custom hook for authentication
 * Provides access to the authenticated user via httpOnly cookies
 *
 * This replaces the old getUserData() from sessionStorage approach.
 * Now we fetch user data from the backend which validates the httpOnly cookie.
 */

import { useState, useEffect, useCallback } from 'react';
import { isDeviceRevoked, handleDeviceRevocationLogout, clearDeviceRevocationFlag } from '../utils/deviceRevocationLogout';
import { fetchWithTokenRefresh } from '../utils/tokenRefreshInterceptor';

// Use relative URL if no API_BASE_URL is set (for proxy setup)
const API_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Hook to get the current authenticated user
 * Fetches from /api/v1/auth/current-user endpoint which validates the httpOnly cookie
 * 
 * @returns {Object} { user, loading, error, refetch }
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithTokenRefresh(`${API_URL}/api/v1/auth/current-user`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Check if 401 is due to device revocation
          try {
            const errorData = await response.clone().json();
            if (isDeviceRevoked(response, errorData)) {
              // Device was revoked - handle logout
              handleDeviceRevocationLogout(errorData);
              return; // Logout handler will redirect
            }
          } catch {
            // Could not parse response body, treat as normal 401
          }

          // Normal 401 (not device revocation) - clear user and stop
          // Don't try to parse response if already redirecting to login
          setUser(null);
          setError(null);
          setLoading(false); // Set loading to false immediately to prevent blank page
          return;
        }

        if (response.status === 404) {
          setUser(null);
          setError(null);
          return;
        }

        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      const userData = await response.json();
      setUser(userData);

      // Clear device revocation flag on successful authentication
      clearDeviceRevocationFlag();
    } catch (err) {
      console.error('Error loading user:', err);
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { 
    user, 
    loading, 
    error, 
    refetch: fetchUser 
  };
};

/**
 * Function to get user data (for backwards compatibility)
 * Use the useAuth hook instead when possible
 * 
 * @returns {Promise<Object|null>} User object or null
 */
export const getUserData = async () => {
  try {
    const response = await fetchWithTokenRefresh(`${API_URL}/api/v1/auth/current-user`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Check if 401 is due to device revocation
      if (response.status === 401) {
        try {
          const errorData = await response.clone().json();
          if (isDeviceRevoked(response, errorData)) {
            // Device was revoked - handle logout
            handleDeviceRevocationLogout(errorData);
            return null; // Logout handler will redirect
          }
        } catch {
          // Could not parse response body, treat as normal 401
        }

        // Normal 401 (not device revocation) - return null immediately
        // Don't try to parse response if already redirecting to login
        return null;
      }

      // Si no está autenticado o el endpoint no existe, retornar null
      return null;
    }

    const userData = await response.json();

    // Clear device revocation flag on successful authentication
    clearDeviceRevocationFlag();

    return userData;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

export default useAuth;
