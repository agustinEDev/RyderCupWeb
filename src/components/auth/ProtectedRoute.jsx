import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import FullScreenLoader from '../ui/FullScreenLoader';

/**
 * Protected Route Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated (via httpOnly cookie validation)
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // La MISMA espera que el resto de la cadena, no un «Loading...» gris propio.
  // Esta pantalla es la que asoma cuando la cortina del arranque agota su plazo
  // (FE #485), y un dibujo distinto justo ahi es lo que se percibe como
  // parpadeo: no son los cortes, es que la imagen cambia.
  if (loading) {
    return <FullScreenLoader />;
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
