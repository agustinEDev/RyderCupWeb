import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';
import { clearUserContext } from '../utils/sentryHelpers';

/**
 * Centralized logout hook
 * Handles all logout operations consistently across the application
 *
 * @returns {Object} - { logout: Function, isLoggingOut: boolean }
 */
export const useLogout = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuthContext();

  /**
   * Centralized logout function
   * Calls backend, clears state, and redirects to login
   */
  const logout = useCallback(async () => {
    const API_URL = import.meta.env.VITE_API_BASE_URL || '';

    try {
      // 1. Call backend logout endpoint
      const response = await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Send httpOnly cookies
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Backend expects JSON body
      });

      if (!response.ok) {
        console.warn('⚠️ [useLogout] Backend logout failed, proceeding with client-side cleanup');
      }
    } catch (error) {
      console.error('❌ [useLogout] Error during backend logout:', error);
      // Continue with client-side cleanup even if backend fails
    } finally {
      // 2. Clear client-side state
      clearAuth();
      clearUserContext();

      // 3. Redirect to login
      navigate('/login', { replace: true });
    }
  }, [navigate, clearAuth]);

  return { logout };
};
