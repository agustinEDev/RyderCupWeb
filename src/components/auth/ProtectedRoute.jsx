import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { debeAceptarLosTerminos } from '../../domain/services/aceptacionDeTerminos';

/**
 * Donde se puede estar con los Términos pendientes (F3): la pantalla de
 * aceptarlos y la de completar el perfil, por la que pasa el usuario nuevo de
 * Google y donde ya los acepta. Llevarle de allí a la otra serían dos pantallas
 * de aceptación seguidas.
 */
const SIN_TERMINOS_ACEPTADOS = ['/accept-terms', '/auth/complete-profile'];

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

  // Términos sin aceptar (solo con `false` estricto: un backend antiguo no
  // manda el campo). Hasta aceptarlos el backend responde 403 a casi todo, así
  // que la pantalla de destino ni se monta
  if (debeAceptarLosTerminos(user) && !SIN_TERMINOS_ACEPTADOS.includes(location.pathname)) {
    return <Navigate to="/accept-terms" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
