/* eslint-disable react-refresh/only-export-components */
import { useEffect, useCallback, lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import PropTypes from 'prop-types';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LazyLoadErrorBoundary from './components/errors/LazyLoadErrorBoundary';
import { getUserData } from './hooks/useAuth';
import { setUserContext } from './utils/sentryHelpers';
import useInactivityLogout from './hooks/useInactivityLogout.jsx';
import { onAuthEvent, EVENTS } from './utils/broadcastAuth';
import { useLogout } from './hooks/useLogout';
import { useDeviceRevocationMonitor } from './hooks/useDeviceRevocationMonitor';

// Lazy loading de páginas para reducir bundle inicial
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const DeviceManagement = lazy(() => import('./pages/DeviceManagement'));
const Competitions = lazy(() => import('./pages/Competitions'));
const CreateCompetition = lazy(() => import('./pages/CreateCompetition'));
const CompetitionDetail = lazy(() => import('./pages/CompetitionDetail'));
const BrowseCompetitions = lazy(() => import('./pages/BrowseCompetitions'));

// ============================================
// SENTRY ROUTING INSTRUMENTATION
// ============================================

// Crear Router con tracking de Sentry
const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

/**
 * Componente interno que contiene la lógica de la app
 * (necesita estar dentro de <Router> para usar useNavigate)
 */
function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { logout } = useLogout();
  const location = useLocation();

  // ============================================
  // RUTAS PÚBLICAS (no requieren autenticación)
  // ============================================
  const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/register',
    '/verify-email',
    '/forgot-password',
    '/reset-password',
  ];

  const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname) ||
                       location.pathname.startsWith('/reset-password/');

  // Establecer contexto de usuario en Sentry si está autenticado (via httpOnly cookie)
  useEffect(() => {
    const initUserContext = async () => {
      // FIX: No verificar sesión en rutas públicas (previene bucle infinito en /login después de logout)
      if (isPublicRoute) {
        setIsAuthenticated(false);
        return;
      }

      const user = await getUserData();
      if (user) {
        setUserContext(user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };
    initUserContext();
  }, [isPublicRoute]);

  /**
   * Función de logout que se ejecuta por inactividad y broadcast
   * Wrapped in useCallback to prevent stale closures
   */
  const handleInactivityLogout = useCallback(async () => {
    setIsAuthenticated(false);
    await logout();
  }, [logout]);

  /**
   * Listener de eventos de broadcast para sincronización multi-tab
   * Escucha eventos de logout desde otras pestañas y ejecuta logout local
   */
  useEffect(() => {
    // Configurar listener de eventos de broadcast
    const cleanup = onAuthEvent((event) => {
      if (event.type === EVENTS.LOGOUT) {
        // Ejecutar logout local (mismo que inactividad)
        handleInactivityLogout();
      }
    });

    // Cleanup: remover listener al desmontar
    return cleanup;
  }, [handleInactivityLogout]); // Dependencies: handleInactivityLogout (stable via useCallback)

  // Hook de logout por inactividad (solo activo si el usuario está autenticado)
  useInactivityLogout({
    timeout: 30 * 60 * 1000, // 30 minutos
    warningTime: 2 * 60 * 1000, // 2 minutos de advertencia
    onLogout: handleInactivityLogout,
    enabled: isAuthenticated // Solo activo cuando hay usuario autenticado
  });

  // Hook de monitoreo de revocación de dispositivo (v1.14.0)
  // Detecta cuando el dispositivo actual fue revocado desde otro navegador
  // Solo activo cuando hay usuario autenticado
  useDeviceRevocationMonitor({
    enabled: isAuthenticated
  });

  return (
    <LazyLoadErrorBoundary>
      <Suspense fallback={
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
      }>
        <SentryRoutes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/profile/devices" element={<ProtectedRoute><DeviceManagement /></ProtectedRoute>} />
        <Route path="/competitions" element={<ProtectedRoute><Competitions /></ProtectedRoute>} />
        <Route path="/competitions/create" element={<ProtectedRoute><CreateCompetition /></ProtectedRoute>} />
        <Route path="/competitions/:id" element={<ProtectedRoute><CompetitionDetail /></ProtectedRoute>} />
        <Route path="/browse-competitions" element={<ProtectedRoute><BrowseCompetitions /></ProtectedRoute>} />
        </SentryRoutes>
      </Suspense>
    </LazyLoadErrorBoundary>
  );
}

/**
 * Error Fallback Component for Sentry ErrorBoundary
 */
const ErrorFallback = ({ error, componentStack, resetError }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: '2rem',
    textAlign: 'center',
    fontFamily: 'system-ui, sans-serif'
  }}>
    <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ef4444' }}>
      Oops! Something went wrong
    </h1>
    <p style={{ color: '#6b7280', marginBottom: '2rem', maxWidth: '600px' }}>
      We&apos;re sorry for the inconvenience. An error occurred and our team has been notified.
      Please try refreshing the page or contact support if the problem persists.
    </p>
    <button
      onClick={resetError}
      style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: '#2d7b3e',
        color: 'white',
        border: 'none',
        borderRadius: '0.5rem',
        fontSize: '1rem',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
      }}
      onMouseOver={(e) => e.target.style.backgroundColor = '#235a2e'}
      onFocus={(e) => e.target.style.backgroundColor = '#235a2e'}
      onMouseOut={(e) => e.target.style.backgroundColor = '#2d7b3e'}
      onBlur={(e) => e.target.style.backgroundColor = '#2d7b3e'}
    >
      Try Again
    </button>
    {process.env.NODE_ENV === 'development' && (
      <details style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '800px' }}>
        <summary style={{ cursor: 'pointer', color: '#ef4444', marginBottom: '0.5rem' }}>
          Error Details (Development Only)
        </summary>
        <pre style={{
          backgroundColor: '#1f2937',
          color: '#f3f4f6',
          padding: '1rem',
          borderRadius: '0.5rem',
          overflow: 'auto',
          fontSize: '0.875rem'
        }}>
          {error?.toString()}
          {componentStack}
        </pre>
      </details>
    )}
  </div>
);

ErrorFallback.propTypes = {
  error: PropTypes.instanceOf(Error),
  componentStack: PropTypes.string,
  resetError: PropTypes.func.isRequired,
};

/**
 * Componente principal App con Router y ErrorBoundary
 */
function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={ErrorFallback}
      showDialog={false}
    >
      <Router>
        <AppContent />
      </Router>
    </Sentry.ErrorBoundary>
  );
}

export default Sentry.withProfiler(App);
