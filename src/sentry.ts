/**
 * Las integraciones pesadas de Sentry: las trazas de navegación y la grabación de las
 * sesiones con error (Replay). Se cargan después del arranque (`import('./sentry')` en
 * main.jsx), sobre el cliente que crea main.jsx, que es donde vive todo lo que filtra
 * (`sentryScrubbing`). Este fichero no crea ningún cliente (FE-07, fase 4 del plan a 9).
 *
 * Variables: VITE_SENTRY_DSN, VITE_SENTRY_ENVIRONMENT, VITE_SENTRY_DEBUG y los
 * VITE_SENTRY_*_SAMPLE_RATE (sentrySampleRates).
 */

import {
  replayIntegration,
  reactRouterV7BrowserTracingIntegration,
  getClient,
} from '@sentry/react';
import { grabaSoloLoQueNoEsNormal } from './utils/avisoDeCierreForzado';
import { useEffect } from 'react';
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router';
import { sentryScrubbing } from './utils/sentryScrubbing';
import { instrumentarRouterEnSentry } from './utils/navegacionesEnSentry';
import { sentrySampleRates } from './utils/sentrySampleRates';

// ============================================
// CONFIGURACIÓN DE VARIABLES DE ENTORNO
// ============================================

const SENTRY_CONFIG = {
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  debug: import.meta.env.VITE_SENTRY_DEBUG === 'true',
  // Los mismos que aplica el arranque de main.jsx, de un solo sitio (FE #792)
  ...sentrySampleRates(import.meta.env),
};

// Obtener release desde package.json
const RELEASE = `rydercup-web@${import.meta.env.VITE_APP_VERSION}`;

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
    // React Router v7 Browser Tracing - Route-aware performance monitoring
    reactRouterV7BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
      // Seguimiento de interacciones de usuario
      traceFetch: true,
      traceXHR: true,
      // Tracking de Web Vitals (LCP, FID, CLS)
      enableLongTask: true,
      enableInp: true,
    }),

    // Replay - Grabación de sesiones
    replayIntegration({
      // Texto enmascarado e imágenes bloqueadas en CUALQUIER entorno (25 oct
      // 2026): Sentry es un tercero, y un entorno de pruebas con la clave y
      // datos reales (el Kind con la copia de PRO) grababa el texto tal cual.
      // Para depurar quedan las migas y la traza.
      maskAllText: true,
      blockAllMedia: true,

      // Configuración de privacidad
      // Nota: maskTextSelector y blockSelector removidos en Sentry 10
      // Usar maskAllText: true para enmascarar todo el texto si es necesario

      // Vacia a proposito (FE #385). Lo que esta lista abre no es la URL -esa
      // Replay la graba siempre, junto al metodo, el estado y la duracion-,
      // sino las CABECERAS Y LOS CUERPOS de lo que case. Con el origen propio
      // dentro, en cualquier despliegue que sirva la API por el mismo host
      // (proxy /api del Vite local, nginx del contenedor) eso son los perfiles,
      // los correos y las listas de amigos enteros dentro de la grabacion.
      // Para depurar ya estan los eventos de error con su breadcrumb.
      networkDetailAllowUrls: [],

      // La grabacion guarda sus propias URLs (el href inicial, las migas de
      // clic, las navegaciones) sin pasar por beforeSend: el token del enlace
      // de restablecimiento y el code de Google salian por aqui
      beforeAddRecordingEvent: sentryScrubbing.beforeAddRecordingEvent,

      // La caducidad normal de una sesión no sube grabación; los cierres raros, sí
      beforeErrorSampling: grabaSoloLoQueNoEsNormal,

      // Sample rates (ya configurados en init)
    }),
  ];

  // Sin widget de feedback de Sentry (FE #792, 2 oct 2026): era un boton
  // flotante en ingles en todas las pantallas, y la app tiene su propio canal
  // para reportar problemas. Su codigo se empaquetaba aunque estuviera apagado

  // ============================================
  // INICIALIZACIÓN DE SENTRY
  // ============================================

  // El cliente lo crea siempre `main.jsx` (con DSN, que es la misma condición de este
  // bloque): aquí solo se le añaden las integraciones pesadas. Hasta la 2.74.0 había
  // además una inicialización completa para cuando no hubiera cliente que nunca se
  // ejecutaba: sus filtros no se aplicaban y propagaba las trazas a cualquier
  // `*.onrender.com` (FE-07, fase 4 del plan a 9). El saneado de verdad vive en
  // `main.jsx` (`sentryScrubbing`)
  const existingClient = getClient();
  if (existingClient) {
    integrations.forEach((integration) => {
      existingClient.addIntegration(integration);
    });
    // El router de la aplicación ya existe: con el seguimiento puesto, Sentry
    // lo instrumenta ahora (FE #647; antes lo hacía `withSentryReactRouterV7Routing`)
    instrumentarRouterEnSentry();
  } else {
    // Sin cliente (main.jsx no lo creó) no hay nada a lo que añadir integraciones
    console.warn('Sentry: no client, the heavy integrations were not added');
  }

  // ============================================
  // LOGS DE INICIALIZACIÓN
  // ============================================

  if (existingClient)
    console.log(`
┌─────────────────────────────────────────────────────────┐
│ 🚀 Sentry Initialized                                   │
├─────────────────────────────────────────────────────────┤
│ Environment:       ${SENTRY_CONFIG.environment.padEnd(32)}│
│ Release:           ${RELEASE.padEnd(32)}│
│ Debug:             ${String(SENTRY_CONFIG.debug).padEnd(32)}│
│ Traces Sample:     ${(SENTRY_CONFIG.tracesSampleRate * 100).toFixed(0)}%${' '.repeat(30)}│
│ Replays Session:   ${(SENTRY_CONFIG.replaysSessionSampleRate * 100).toFixed(0)}%${' '.repeat(30)}│
│ Replays On Error:  ${(SENTRY_CONFIG.replaysOnErrorSampleRate * 100).toFixed(0)}%${' '.repeat(30)}│
└─────────────────────────────────────────────────────────┘
  `);
}
