/**
 * Los porcentajes de muestreo de Sentry, en un solo sitio (FE #792).
 *
 * Los lee el arranque mínimo de `main.jsx`, que es el que de verdad los aplica:
 * después de `init` ya no se pueden cambiar. `src/sentry.ts` los
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
 * construir. Una a una y nunca el objeto de variables entero: Vite convierte el objeto
 * entero en TODAS las variables `VITE_*` de la compilación y las mete en el
 * paquete que descarga cualquiera (auditoría de la fase 6, F-03).
 */
const VARIABLES_DE_SENTRY = {
  VITE_SENTRY_TRACES_SAMPLE_RATE: import.meta.env
    .VITE_SENTRY_TRACES_SAMPLE_RATE,
  VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: import.meta.env
    .VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
  VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: import.meta.env
    .VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
};

export function sentrySampleRates(env = VARIABLES_DE_SENTRY) {
  return {
    tracesSampleRate: parseFloat(env.VITE_SENTRY_TRACES_SAMPLE_RATE || '1.0'),
    replaysSessionSampleRate: parseFloat(
      env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0',
    ),
    replaysOnErrorSampleRate: parseFloat(
      env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || '1.0',
    ),
  };
}
