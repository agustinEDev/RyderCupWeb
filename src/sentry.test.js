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

const navegaciones = vi.hoisted(() => ({ instrumentar: vi.fn() }));
vi.mock('./utils/navegacionesEnSentry', () => ({ instrumentarRouterEnSentry: navegaciones.instrumentar }));

const cliente = vi.hoisted(() => ({ hay: true }));
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  getClient: () => (cliente.hay ? { addIntegration: sentry.addIntegration } : undefined),
  feedbackIntegration: sentry.feedbackIntegration,
  replayIntegration: sentry.replayIntegration,
  reactRouterV7BrowserTracingIntegration: sentry.reactRouterV7BrowserTracingIntegration,
}));

describe('sentry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    cliente.hay = true;
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

  it('N8 (FE #647): con el seguimiento ya añadido, instrumenta el router de la aplicación', async () => {
    sentry.addIntegration.mockImplementation((integracion) => {
      // Lo que importa es el orden: el router, DESPUÉS de tener el seguimiento
      if (integracion.name === 'BrowserTracing') expect(navegaciones.instrumentar).not.toHaveBeenCalled();
    });

    await import('./sentry');

    expect(navegaciones.instrumentar).toHaveBeenCalledTimes(1);
    const nombres = sentry.addIntegration.mock.calls.map(([integracion]) => integracion.name);
    expect(nombres).toContain('BrowserTracing');
  });

  it('N9: sin cliente previo (init completo aquí), también instrumenta el router', async () => {
    cliente.hay = false;

    await import('./sentry');

    expect(navegaciones.instrumentar).toHaveBeenCalledTimes(1);
  });

  it('sigue añadiendo las trazas y la grabación de las sesiones con error', async () => {
    await import('./sentry');

    const nombres = sentry.addIntegration.mock.calls.map(([integracion]) => integracion.name);
    expect(nombres).toEqual(['BrowserTracing', 'Replay']);
  });

  // R1 (25 oct 2026): en cualquier entorno, no solo en producción. Un entorno
  // de pruebas con la clave de Sentry y datos reales (el Kind con la copia de
  // PRO) grababa el texto tal cual
  it('R1: la grabación enmascara el texto y bloquea las imágenes fuera de producción', async () => {
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'development');

    await import('./sentry');

    expect(sentry.replayIntegration).toHaveBeenCalledWith(
      expect.objectContaining({ maskAllText: true, blockAllMedia: true })
    );
  });

  // R2 (auditoría OWASP, 5 nov 2026): cada caducidad normal subía su grabación
  it('R2: la grabación no se sube por un aviso de caducidad normal, sí por los raros', async () => {
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'development');
    const { grabaSoloLoQueNoEsNormal } = await import('./utils/avisoDeCierreForzado');

    await import('./sentry');

    expect(sentry.replayIntegration).toHaveBeenCalledWith(
      expect.objectContaining({ beforeErrorSampling: grabaSoloLoQueNoEsNormal })
    );
  });

  it('el cuerpo de una petición va sin contraseña, tokens ni lo del canje de Google (fase 3)', async () => {
    cliente.hay = false;
    const { init } = await import('@sentry/react');
    await import('./sentry');

    const { beforeSend } = init.mock.calls[0][0];
    const evento = beforeSend(
      {
        request: {
          data: {
            password: 'p',
            access_token: 'a',
            refresh_token: 'r',
            token: 't',
            code_verifier: 'v',
            authorization_code: 'c',
            otro: 'se queda',
          },
        },
      },
      {}
    );

    expect(evento.request.data).toEqual({ otro: 'se queda' });
  });

  it('con el cuerpo en texto: si es JSON se tacha igual; si no, por patrón (/code-review)', async () => {
    cliente.hay = false;
    const { init } = await import('@sentry/react');
    await import('./sentry');
    const { beforeSend } = init.mock.calls[0][0];
    const cuerpo = (data) => beforeSend({ request: { data } }, {}).request.data;

    const json = JSON.parse(cuerpo(JSON.stringify({ token: 't', code_verifier: 'v', authorization_code: 'c', password: 'p', otro: 1 })));
    expect(json).toEqual({ otro: 1 });

    const formulario = cuerpo('token=t1&code_verifier=v1&authorization_code=c1&otro=2');
    expect(formulario).not.toMatch(/t1|v1|c1/);
    expect(formulario).toContain('otro=2');

    const roto = cuerpo('{"token": "t2", "code_verifier":"v2", "password":"p2" ...');
    expect(roto).not.toMatch(/t2|v2|p2/);
  });
});
