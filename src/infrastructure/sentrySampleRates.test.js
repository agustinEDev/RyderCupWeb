/**
 * Los porcentajes de muestreo de Sentry (FE #792).
 *
 * Se leían en dos sitios, `main.jsx` y `infrastructure/sentry.ts`, cada uno con
 * sus valores por defecto: cambiar uno dejaba al otro desincronizado. Ahora los
 * dos leen de aquí.
 *
 * Decidido el 2 oct 2026: se graban las sesiones con error (para saber qué hizo
 * el usuario antes) y deja de grabarse el 10% de las sesiones al azar.
 */
import { describe, expect, it } from 'vitest';
import { sentrySampleRates } from './sentrySampleRates';

describe('sentrySampleRates', () => {
  it('sin variables no graba sesiones al azar, pero sí todas las que tienen error', () => {
    const rates = sentrySampleRates({});

    expect(rates.replaysSessionSampleRate).toBe(0);
    expect(rates.replaysOnErrorSampleRate).toBe(1);
  });

  it('sin variables traza todas las peticiones, como hasta ahora', () => {
    expect(sentrySampleRates({}).tracesSampleRate).toBe(1);
  });

  it('una variable definida manda sobre el valor por defecto', () => {
    const rates = sentrySampleRates({
      VITE_SENTRY_TRACES_SAMPLE_RATE: '0.2',
      VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: '0.05',
      VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: '0.5',
    });

    expect(rates).toEqual({
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 0.5,
    });
  });
});
