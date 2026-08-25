import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

/**
 * Protected Route Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated (via httpOnly cookie validation)
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Una espera sobria y no la pantalla de marca, aunque esta sea la que asoma
  // si la cortina del arranque agota su plazo (FE #485). `ProtectedRoute` se
  // remonta en CADA navegacion protegida y su `useAuth` vuelve a preguntar por
  // la sesion, asi que poner aqui el arranque verde convertia cada salto
  // —Panel, Perfil, Amigos— en un relampago de pantalla de bienvenida, como si
  // la aplicacion se reiniciara. Se prefiere que la imagen cambie en el caso
  // raro —vencer el plazo con mala red— a meter un parpadeo en el corriente.
  // Deja de hacer falta cuando la sesion se resuelva una sola vez: FE #489.
  if (loading) {
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
