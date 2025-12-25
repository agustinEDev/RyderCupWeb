import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Protected Route Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated (via httpOnly cookie validation)
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { user, loading } = useAuth();

  console.log('🛡️ [ProtectedRoute] Checking authentication...');
  console.log('🛡️ [ProtectedRoute] Location:', location.pathname);
  console.log('🛡️ [ProtectedRoute] Loading:', loading);
  console.log('🛡️ [ProtectedRoute] User:', user);

  // Show loading state while checking authentication
  if (loading) {
    console.log('⏳ [ProtectedRoute] Still loading, showing spinner...');
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        color: '#6b7280'
      }}>
        Loading...
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    console.warn('⚠️ [ProtectedRoute] No user found! Redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('✅ [ProtectedRoute] User authenticated! Rendering protected content');
  return children;
};

export default ProtectedRoute;
