import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigationType, createRoutesFromChildren, matchRoutes } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Competitions from './pages/Competitions';
import CreateCompetition from './pages/CreateCompetition';
import CompetitionDetail from './pages/CompetitionDetail';
import BrowseCompetitions from './pages/BrowseCompetitions';
import SentryTest from './pages/SentryTest';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { migrateFromLocalStorage, getUserData } from './utils/secureAuth';
import { setUserContext } from './utils/sentryHelpers';

// ============================================
// SENTRY ROUTING INSTRUMENTATION
// ============================================

// Crear Router con tracking de Sentry
const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

function App() {
  // Migrate existing users from localStorage to sessionStorage
  useEffect(() => {
    migrateFromLocalStorage();

    // Establecer contexto de usuario en Sentry si está logueado
    const user = getUserData();
    if (user) {
      setUserContext(user);
    }
  }, []);

  return (
    <Sentry.ErrorBoundary
      fallback={({ error, componentStack, resetError }) => (
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
            onMouseOut={(e) => e.target.style.backgroundColor = '#2d7b3e'}
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
      )}
      showDialog={false}
    >
      <Router>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#131613',
            border: '1px solid #dee3df',
            borderRadius: '0.5rem',
            padding: '16px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#2d7b3e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <SentryRoutes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/competitions" element={<ProtectedRoute><Competitions /></ProtectedRoute>} />
        <Route path="/competitions/create" element={<ProtectedRoute><CreateCompetition /></ProtectedRoute>} />
        <Route path="/competitions/:id" element={<ProtectedRoute><CompetitionDetail /></ProtectedRoute>} />
        <Route path="/browse-competitions" element={<ProtectedRoute><BrowseCompetitions /></ProtectedRoute>} />

        {/* Debug/Testing route (remove in production) */}
        <Route path="/sentry-test" element={<ProtectedRoute><SentryTest /></ProtectedRoute>} />
      </SentryRoutes>
    </Router>
    </Sentry.ErrorBoundary>
  );
}

export default Sentry.withProfiler(App);
