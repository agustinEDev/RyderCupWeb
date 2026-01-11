/**
 * useAuthContext hook
 * Provides access to authentication context
 * v1.13.0: CSRF Protection
 */

import { useContext } from 'react';
import AuthContext from '../contexts/AuthContext.jsx';

/**
 * Custom hook to access auth context
 * @returns {Object} Auth context value with user, csrfToken, and methods
 * @throws {Error} If used outside AuthProvider
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export default useAuthContext;
