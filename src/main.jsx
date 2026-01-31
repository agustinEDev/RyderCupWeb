import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import './index.css';
import './i18n'; // Import i18n initialization
import { AuthProviderWithGlobalSync } from './contexts/AuthContext'; // v1.13.0: CSRF Protection

// ============================================
// EARLY SENTRY INITIALIZATION
// ============================================
// Minimal early init to capture errors immediately (before heavy integrations load)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
    release: `rydercup-web@${import.meta.env.VITE_APP_VERSION || '1.6.0'}`,
    // No integrations yet - will be added by lazy-loaded infrastructure/sentry
    integrations: [],
    // Configure sample rates from env (these cannot be changed after init)
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '1.0'),
    profilesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_PROFILES_SAMPLE_RATE || '1.0'),
    replaysSessionSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0.1'),
    replaysOnErrorSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || '1.0'),
    attachStacktrace: true,
  });
}

// ============================================
// LAZY LOAD HEAVY SENTRY INTEGRATIONS
// ============================================
// Load heavy integrations (BrowserTracing, Replay, Feedback) after 2 seconds or on error
// This reduces initial bundle size while still capturing early errors
let sentryIntegrationsLoaded = false;

const loadSentryIntegrations = () => {
  if (sentryIntegrationsLoaded) return;
  sentryIntegrationsLoaded = true;

  import('./infrastructure/sentry').catch((error) => {
    console.warn('⚠️ Failed to load Sentry integrations:', error);
  });
};

// Load after 2 seconds
setTimeout(loadSentryIntegrations, 2000);

// Also load immediately if there's an error
window.addEventListener('error', loadSentryIntegrations, { once: true });
window.addEventListener('unhandledrejection', loadSentryIntegrations, { once: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProviderWithGlobalSync>
      {/* Toast Notifications - En el nivel más alto para que siempre esté disponible */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#131613',
            border: '1px solid #dee3df',
            borderRadius: '0.5rem',
            padding: '16px',
            fontSize: '14px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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
      <App />
    </AuthProviderWithGlobalSync>
  </React.StrictMode>,
);

