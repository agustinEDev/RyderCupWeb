import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import { startCapturingInstallPrompt } from './utils/installPromptCapture';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';
import { scrubUrl } from './utils/scrubUrl';
import './index.css';
import './i18n'; // Import i18n initialization
import { AuthProviderWithGlobalSync } from './contexts/AuthContext'; // v1.13.0: CSRF Protection

// Cuanto antes, mejor: Chrome dispara `beforeinstallprompt` nada más procesar
// el manifiesto, muy por delante del montaje de React (FE #334)
startCapturingInstallPrompt();

// Sustituye al registro que inyectaba el plugin: además de registrar, recarga
// cuando entra una versión nueva y la busca al volver a primer plano
registerServiceWorker();

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

    // El saneado de URLs va AQUI y no en infrastructure/sentry.ts (FE #385).
    // Aquel fichero carga dos segundos mas tarde y para entonces ya hay
    // cliente, asi que solo ejecuta su rama de `addIntegration`: sus ganchos
    // `beforeSend`/`beforeBreadcrumb` nunca llegan a registrarse. Lo que se
    // configura despues de esta llamada no filtra nada.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = scrubUrl(breadcrumb.data.url);
      }
      return breadcrumb;
    },

    beforeSend(event) {
      if (event.request?.url) {
        event.request.url = scrubUrl(event.request.url);
      }
      return event;
    },

    // Los spans HTTP llevan la URL completa en su descripcion y en sus datos
    beforeSendTransaction(transaction) {
      if (transaction.request?.url) {
        transaction.request.url = scrubUrl(transaction.request.url);
      }

      transaction.spans?.forEach((span) => {
        if (span.description) {
          span.description = scrubUrl(span.description);
        }
        for (const key of ['url', 'http.url']) {
          if (typeof span.data?.[key] === 'string') {
            span.data[key] = scrubUrl(span.data[key]);
          }
        }
      });

      return transaction;
    },

    // Un span puede viajar solo, en su propio envelope, sin transaccion que lo
    // envuelva: por ahi `beforeSendTransaction` no pasa nunca y la URL entera
    // -con su query string- saldria sin sanear.
    beforeSendSpan(span) {
      if (span.description) {
        span.description = scrubUrl(span.description);
      }
      for (const key of ['url', 'http.url']) {
        if (typeof span.data?.[key] === 'string') {
          span.data[key] = scrubUrl(span.data[key]);
        }
      }

      return span;
    },
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
      {/* Las notificaciones se montan dentro de App: su posición depende de si
          la navegación inferior está visible, y esa condición solo se conoce
          allí (FE #322) */}
      <App />
    </AuthProviderWithGlobalSync>
  </React.StrictMode>,
);

