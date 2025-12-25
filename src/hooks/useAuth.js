/**
 * Custom hook for authentication
 * Provides access to the authenticated user via httpOnly cookies
 *
 * This replaces the old getUserData() from sessionStorage approach.
 * Now we fetch user data from the backend which validates the httpOnly cookie.
 */

import { useState, useEffect, useCallback } from 'react';
import apiRequest from '../services/api.js';

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

      const userData = await apiRequest('/api/v1/auth/current-user');
      setUser(userData);
    } catch (err) {
      // 401 or 404 means user is not authenticated
      if (err.message.includes('401') || err.message.includes('404')) {
        setUser(null);
        setError(null);
      } else {
        console.error('Error fetching user:', err);
        setError(err.message);
        setUser(null);
      }
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
    return await apiRequest('/api/v1/auth/current-user');
  } catch (error) {
    // Si no está autenticado o hay error, retornar null
    console.error('Error fetching user data:', error);
    return null;
  }
};

export default useAuth;
