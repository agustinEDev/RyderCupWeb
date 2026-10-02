/**
 * Los porcentajes de muestreo de Sentry, en un solo sitio (FE #792).
 *
 * Los lee el arranque mínimo de `main.jsx`, que es el que de verdad los aplica:
 * después de `init` ya no se pueden cambiar. `infrastructure/sentry.ts` los
 * muestra en su resumen. Antes cada uno tenía su copia con sus valores por
 * defecto.
 *
 * - Trazas: todas, como hasta ahora.
 * - Grabación de sesiones al azar: ninguna. Decidido el 2 oct 2026; antes era
 *   el 10%.
 * - Grabación de las sesiones con error: todas, para saber qué hizo el usuario
 *   antes del fallo.
 *
 * Cada valor se puede cambiar con su variable de entorno, que se lee al
 * construir.
 */
export function sentrySampleRates(env = import.meta.env) {
  return {
    tracesSampleRate: parseFloat(env.VITE_SENTRY_TRACES_SAMPLE_RATE || '1.0'),
    replaysSessionSampleRate: parseFloat(env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0'),
    replaysOnErrorSampleRate: parseFloat(env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || '1.0'),
  };
}
