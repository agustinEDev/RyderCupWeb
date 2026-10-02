/**
 * Las integraciones que se añaden a Sentry tras el arranque (FE #792).
 *
 * Decidido el 2 oct 2026: el widget de feedback de Sentry se quita. Ponía un
 * botón flotante en inglés («Report a Problem») en todas las pantallas, y la app
 * tiene su propio canal para reportar problemas. Su código se empaquetaba
 * aunque la variable estuviera a false.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({
  addIntegration: vi.fn(),
  feedbackIntegration: vi.fn(() => ({ name: 'Feedback' })),
  replayIntegration: vi.fn(() => ({ name: 'Replay' })),
  reactRouterV7BrowserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
}));

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  getClient: () => ({ addIntegration: sentry.addIntegration }),
  feedbackIntegration: sentry.feedbackIntegration,
  replayIntegration: sentry.replayIntegration,
  reactRouterV7BrowserTracingIntegration: sentry.reactRouterV7BrowserTracingIntegration,
}));

describe('infrastructure/sentry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SENTRY_DSN', 'https://clave@ejemplo.ingest.sentry.io/1');
    vi.spyOn(globalThis.console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('no añade el widget de feedback aunque la variable lo pida', async () => {
    vi.stubEnv('VITE_SENTRY_ENABLE_FEEDBACK', 'true');

    await import('./sentry');

    expect(sentry.feedbackIntegration).not.toHaveBeenCalled();
    const nombres = sentry.addIntegration.mock.calls.map(([integracion]) => integracion.name);
    expect(nombres).not.toContain('Feedback');
  });

  it('sigue añadiendo las trazas y la grabación de las sesiones con error', async () => {
    await import('./sentry');

    const nombres = sentry.addIntegration.mock.calls.map(([integracion]) => integracion.name);
    expect(nombres).toEqual(['BrowserTracing', 'Replay']);
  });
});
