import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from './useAuthContext';
import { clearUserContext } from '../utils/sentryHelpers';
import { logoutUseCase } from '../composition';

/**
 * Centralized logout hook
 * Handles all logout operations consistently across the application
 *
 * @returns {Object} - { logout: Function }
 */
export const useLogout = () => {
  const navigate = useNavigate();
  const { clearAuth } = useAuthContext();

  /**
   * Centralized logout function
   * Calls backend, clears state, and redirects to login
   *
   * @param {Object} options - Logout options
   * @param {boolean} options.skipBackendCall - If true, skip backend logout call (useful when device already revoked)
   */
  const logout = useCallback(async ({ skipBackendCall = false } = {}) => {
    if (!skipBackendCall) {
      try {
        await logoutUseCase.execute();
      } catch {
        // Continue with client-side cleanup even if backend fails
      }
    }

    // Clear client-side state
    clearAuth();
    clearUserContext();

    // Redirect to login
    navigate('/login', { replace: true });
  }, [navigate, clearAuth]);

  return { logout };
};
