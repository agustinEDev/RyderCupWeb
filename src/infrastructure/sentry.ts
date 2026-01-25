/**
 * Sentry Configuration - Error Tracking & Performance Monitoring
 *
 * Este archivo inicializa Sentry con configuración avanzada por entorno.
 *
 * Configuración por entorno:
 * - Development: Sample rates altos (1.0), debug habilitado, profiling completo
 * - Production: Sample rates optimizados (0.1-0.2), debug deshabilitado
 *
 * Integraciones:
 * ✅ BrowserTracing - Monitoreo de rendimiento (navegación, requests HTTP)
 * ✅ Replay - Grabación de sesiones (normal + on error)
 * ✅ Feedback - Widget de feedback para usuarios (opcional)
 * ✅ Auto Session Tracking - Seguimiento automático de sesiones
 * ✅ Attach Stack Trace - Stack traces en todos los mensajes
 *
 * Variables de entorno requeridas (.env):
 * - VITE_SENTRY_DSN
 * - VITE_SENTRY_ENVIRONMENT
 * - VITE_SENTRY_DEBUG
 * - VITE_SENTRY_TRACES_SAMPLE_RATE
 * - VITE_SENTRY_PROFILES_SAMPLE_RATE
 * - VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE
 * - VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE
 * - VITE_SENTRY_AUTO_SESSION_TRACKING
 * - VITE_SENTRY_ATTACH_STACKTRACE
 * - VITE_SENTRY_ENABLE_FEEDBACK
 */

import { init, replayIntegration, browserTracingIntegration, feedbackIntegration } from '@sentry/react';

// ============================================
// CONFIGURACIÓN DE VARIABLES DE ENTORNO
// ============================================

const SENTRY_CONFIG = {
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  debug: import.meta.env.VITE_SENTRY_DEBUG === 'true',
  tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '1.0'),
  profilesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_PROFILES_SAMPLE_RATE || '1.0'),
  replaysSessionSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0.1'),
  replaysOnErrorSampleRate: parseFloat(import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || '1.0'),
  autoSessionTracking: import.meta.env.VITE_SENTRY_AUTO_SESSION_TRACKING === 'true',
  attachStacktrace: import.meta.env.VITE_SENTRY_ATTACH_STACKTRACE === 'true',
  enableFeedback: import.meta.env.VITE_SENTRY_ENABLE_FEEDBACK === 'true',
};

// Obtener release desde package.json
const RELEASE = `rydercup-web@${import.meta.env.VITE_APP_VERSION || '1.6.0'}`;

// ============================================
// VALIDACIÓN DE CONFIGURACIÓN
// ============================================

if (!SENTRY_CONFIG.dsn) {
  console.warn('⚠️ Sentry DSN not configured. Error tracking is disabled.');
  // No inicializar Sentry si no hay DSN
} else {
  // ============================================
  // INTEGRACIONES
  // ============================================

  const integrations = [
    // Browser Tracing - Monitoreo de rendimiento de navegación
    browserTracingIntegration({
      // Seguimiento de interacciones de usuario
      traceFetch: true,
      traceXHR: true,
      // Tracking de Web Vitals (LCP, FID, CLS)
      enableLongTask: true,
      enableInp: true,
    }),

    // Replay - Grabación de sesiones
    replayIntegration({
      // Máscara de texto sensible
      maskAllText: false, // Cambiar a true en producción si hay datos sensibles
      blockAllMedia: false, // Bloquear imágenes/videos (recomendado en producción)

      // Configuración de privacidad
      // Nota: maskTextSelector y blockSelector removidos en Sentry 10
      // Usar maskAllText: true para enmascarar todo el texto si es necesario

      // Ignorar errores de red específicos
      networkDetailAllowUrls: [
        window.location.origin,
        import.meta.env.VITE_API_BASE_URL,
      ],

      // Sample rates (ya configurados en init)
    }),
  ];

  // Feedback Integration (opcional) - Widget para que usuarios reporten problemas
  if (SENTRY_CONFIG.enableFeedback) {
    integrations.push(
      // @ts-ignore - Feedback integration types are not fully compatible with Integration type
      feedbackIntegration({
        // Configuración del widget
        colorScheme: 'system', // 'light', 'dark', 'system'
        showBranding: true,
        autoInject: true, // Inyectar automáticamente el botón
        // Personalización de textos (opcional)
        formTitle: 'Report a Problem',
        submitButtonLabel: 'Send Feedback',
        messagePlaceholder: 'Describe what happened...',
        successMessageText: 'Thank you for your feedback!',
      })
    );
  }

  // ============================================
  // INICIALIZACIÓN DE SENTRY
  // ============================================

  init({
    dsn: SENTRY_CONFIG.dsn,
    environment: SENTRY_CONFIG.environment,
    release: RELEASE,
    debug: SENTRY_CONFIG.debug,

    // Integraciones
    integrations,

    // ===== PERFORMANCE MONITORING =====
    tracesSampleRate: SENTRY_CONFIG.tracesSampleRate,
    profilesSampleRate: SENTRY_CONFIG.profilesSampleRate,

    // ===== SESSION REPLAY =====
    replaysSessionSampleRate: SENTRY_CONFIG.replaysSessionSampleRate,
    replaysOnErrorSampleRate: SENTRY_CONFIG.replaysOnErrorSampleRate,

    // ===== CONFIGURACIÓN GENERAL =====
    // autoSessionTracking removido en Sentry 10
    attachStacktrace: SENTRY_CONFIG.attachStacktrace,

    // Propagación de traces (movido desde browserTracingIntegration en v10)
    tracePropagationTargets: [
      'localhost',
      /^\//,
      /^https?:\/\/.*\.onrender\.com/,
      import.meta.env.VITE_API_BASE_URL,
    ],

    // Normalización de URLs (remover query strings con datos sensibles)
    normalizeDepth: 5,

    // ===== FILTRADO DE EVENTOS =====
    beforeSend(event, hint) {
      // Filtrar errores conocidos o no críticos

      // 1. Ignorar errores de extensiones de navegador
      if (event.exception) {
        const exceptionValue = event.exception.values?.[0]?.value;
        if (
          exceptionValue?.includes('chrome-extension://') ||
          exceptionValue?.includes('moz-extension://')
        ) {
          return null; // No enviar evento
        }
      }

      // 2. Ignorar errores de red común (timeout)
      if (event.message?.includes('timeout')) {
        return null;
      }

      // 3. Sanitizar datos sensibles
      if (event.request) {
        // Remover headers sensibles
        delete event.request.headers?.Authorization;
        delete event.request.headers?.Cookie;

        // Remover datos sensibles del cuerpo
        if (event.request.data && typeof event.request.data === 'object') {
          const sanitized = { ...(event.request.data as Record<string, unknown>) };
          delete sanitized.password;
          delete sanitized.access_token;
          delete sanitized.refresh_token;
          event.request.data = sanitized;
        }
      }

      // 4. En desarrollo, mostrar error en consola también
      if (SENTRY_CONFIG.debug && hint.originalException) {
        console.error('🐛 Sentry captured error:', hint.originalException);
      }

      return event; // Enviar evento
    },

    // Filtrar transacciones (rendimiento)
    beforeSendTransaction(transaction) {
      // Ignorar transacciones muy rápidas (< 50ms) para reducir ruido
      const duration = transaction.timestamp - transaction.start_timestamp;
      if (duration < 0.05) {
        return null;
      }

      return transaction;
    },

    // ===== OPCIONES DE TRANSPORTE =====
    // Configurar tiempo de espera y reintentos
    transport: undefined, // Usar transporte por defecto
    transportOptions: {
      // No configurar si usamos valores por defecto
    },

    // ===== CONFIGURACIÓN DE BREADCRUMBS =====
    maxBreadcrumbs: 100, // Máximo de breadcrumbs a guardar
    beforeBreadcrumb(breadcrumb, hint) {
      // Filtrar breadcrumbs de consola en producción
      if (breadcrumb.category === 'console' && SENTRY_CONFIG.environment === 'production') {
        return null;
      }

      // Sanitizar URLs con tokens
      if (breadcrumb.data?.url) {
        breadcrumb.data.url = breadcrumb.data.url.replace(/token=[^&]+/, 'token=[REDACTED]');
      }

      return breadcrumb;
    },
  });

  // ============================================
  // LOGS DE INICIALIZACIÓN
  // ============================================

  console.log(`
┌─────────────────────────────────────────────────────────┐
│ 🚀 Sentry Initialized                                   │
├─────────────────────────────────────────────────────────┤
│ Environment:       ${SENTRY_CONFIG.environment.padEnd(32)}│
│ Release:           ${RELEASE.padEnd(32)}│
│ Debug:             ${String(SENTRY_CONFIG.debug).padEnd(32)}│
│ Traces Sample:     ${(SENTRY_CONFIG.tracesSampleRate * 100).toFixed(0)}%${' '.repeat(30)}│
│ Profiles Sample:   ${(SENTRY_CONFIG.profilesSampleRate * 100).toFixed(0)}%${' '.repeat(30)}│
│ Replays Session:   ${(SENTRY_CONFIG.replaysSessionSampleRate * 100).toFixed(0)}%${' '.repeat(30)}│
│ Replays On Error:  ${(SENTRY_CONFIG.replaysOnErrorSampleRate * 100).toFixed(0)}%${' '.repeat(30)}│
│ Feedback Widget:   ${String(SENTRY_CONFIG.enableFeedback).padEnd(32)}│
└─────────────────────────────────────────────────────────┘
  `);
}

// ============================================
// EXPORTS
// ============================================

export default SENTRY_CONFIG;
