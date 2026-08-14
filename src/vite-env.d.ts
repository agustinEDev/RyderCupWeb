/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string
  readonly VITE_SENTRY_ENVIRONMENT: string
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE: string
  readonly VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: string
  readonly VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: string
  readonly VITE_ENABLE_SESSION_REPLAY: string
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string
  readonly VITE_SENTRY_DEBUG: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Configuracion inyectada en tiempo de ejecucion por entrypoint.sh en los
// despliegues en contenedor. No existe en el sitio estatico de produccion.
declare var APP_CONFIG: { API_BASE_URL?: string } | undefined
