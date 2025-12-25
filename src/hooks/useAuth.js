/**
 * Custom hook for authentication
 * Provides access to the authenticated user via httpOnly cookies
 * 
 * This replaces the old getUserData() from sessionStorage approach.
 * Now we fetch user data from the backend which validates the httpOnly cookie.
 */

import { useState, useEffect, useCallback } from 'react';

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

      const response = await fetch(`${API_URL}/api/v1/auth/current-user`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          setUser(null);
          setError(null);
          return;
        }
        throw new Error(`Failed to fetch user: ${response.status}`);
      }

      const userData = await response.json();
      setUser(userData);
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
    const response = await fetch(`${API_URL}/api/v1/auth/current-user`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Si no está autenticado o el endpoint no existe, retornar null
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

export default useAuth;
