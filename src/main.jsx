import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import { startCapturingInstallPrompt } from './utils/installPromptCapture';
import { registerServiceWorker } from './utils/serviceWorkerRegistration';
import { sentryScrubbing } from './utils/sentryScrubbing';
import { sentrySampleRates } from './infrastructure/sentrySampleRates';
import { whenAddressBarIsClean } from './utils/stripSecretsFromAddressBar';
// Solo por el efecto de módulo: anota si la aplicación arrancó en la portada
// antes de que React navegue a ningún sitio
import './utils/appStartup';
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
    // Sample rates: no se pueden cambiar despues de init. Salen de un solo
    // sitio (FE #792): sin grabacion de sesiones al azar, todas las de error
    ...sentrySampleRates(import.meta.env),
    attachStacktrace: true,

    // El saneado de URLs va AQUI y no en infrastructure/sentry.ts (FE #385).
    // Aquel fichero carga dos segundos mas tarde y para entonces ya hay
    // cliente, asi que solo ejecuta su rama de `addIntegration`: sus ganchos
    // `beforeSend`/`beforeBreadcrumb` nunca llegan a registrarse. Lo que se
    // configura despues de esta llamada no filtra nada.
    //
    // Todos pasan `scrubUrl` por todo el texto de lo que sale (utils/
    // sentryScrubbing.js): las migas (tambien el from/to de las navegaciones)
    // y los spans sueltos, que con Sentry 11 viajan solos, sin transaccion.
    beforeBreadcrumb: sentryScrubbing.beforeBreadcrumb,
    beforeSendSpan: sentryScrubbing.beforeSendSpan,
  });

  // Los eventos -errores (con su Referer), transacciones y el de Replay con
  // su lista de URLs, que no pasa por `beforeSend`- pasan todos por los
  // procesadores de eventos: uno solo los cubre sin recorrerlos dos veces
  Sentry.addEventProcessor(sentryScrubbing.eventProcessor);
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

  // Replay graba el href de la pagina al empezar, sin pasar por ningun gancho:
  // con un token en la barra se espera a que la pagina lo quite
  whenAddressBarIsClean(() => {
    import('./infrastructure/sentry').catch((error) => {
      console.warn('⚠️ Failed to load Sentry integrations:', error);
    });
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
