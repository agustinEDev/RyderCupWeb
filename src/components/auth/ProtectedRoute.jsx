import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import FullScreenLoader from '../ui/FullScreenLoader';
import { retenerEspera, soltarEspera, retirarPantallaDeArranque } from '../../utils/arranque';

/**
 * Protected Route Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated (via httpOnly cookie validation)
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Esta pantalla NO suspende: consulta la sesion por su cuenta, asi que para el
  // `Suspense` la ruta ya esta lista y la espera del arranque se retiraria
  // dejando ver esto por debajo. Mientras dure la consulta se retiene, y al
  // acabar se suelta y se retira: la espera dura una sola vez, hasta que hay
  // pantalla de verdad.
  useEffect(() => {
    if (!loading) {
      soltarEspera();
      retirarPantallaDeArranque();
      return undefined;
    }
    retenerEspera();
    return () => soltarEspera();
  }, [loading]);

  if (loading) {
    // La misma espera que el resto de la aplicacion: antes era un div sin
    // estilo con «Loading...» en ingles, durante una peticion de red entera
    return <FullScreenLoader />;
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
