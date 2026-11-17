import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Re-auditoría Q-FE-07: en producción `drop_console` quita los console.error,
 * y lo que caía en un catch no lo veía nadie. Ahora, en desarrollo, la consola
 * de siempre; en producción, un aviso a Sentry por sitio y como mucho uno por
 * minuto, sin datos de la persona.
 */

const captureError = vi.fn();
vi.mock('./sentryHelpers', () => ({
  captureError: (...args) => captureError(...args),
}));

const carga = async () => {
  vi.resetModules();
  return (await import('./registraElFallo')).registraElFallo;
};

const http = (status, extra = {}) =>
  Object.assign(new Error('Internal Server Error'), { status, ...extra });

describe('registraElFallo', () => {
  beforeEach(() => {
    captureError.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('in development', () => {
    it('writes the same console.error as before and does not report', async () => {
      const registraElFallo = await carga();
      const error = new Error('boom');

      registraElFallo('ficha.aprobar', 'Error approving:', error);

      expect(console.error).toHaveBeenCalledWith('Error approving:', error);
      expect(captureError).not.toHaveBeenCalled();
    });
  });

  describe('in production', () => {
    beforeEach(() => {
      vi.stubEnv('DEV', false);
    });

    it('reports a warning with a stable fingerprint per site', async () => {
      const registraElFallo = await carga();
      const error = http(500, { errorCode: 'BOOM' });

      registraElFallo('ficha.aprobar', 'Error approving:', error);

      expect(captureError).toHaveBeenCalledTimes(1);
      expect(captureError).toHaveBeenCalledWith(error, {
        level: 'warning',
        tags: { fallo: 'ficha.aprobar', status: '500', errorCode: 'BOOM' },
        fingerprint: ['registraElFallo', 'ficha.aprobar'],
      });
    });

    it('sends nothing but the error: no extra with the other arguments', async () => {
      const registraElFallo = await carga();

      registraElFallo('perfil', 'Error for ana@club.es:', http(500), {
        email: 'ana@club.es',
      });

      const [, contexto] = captureError.mock.calls[0];
      expect(contexto.extra).toBeUndefined();
      expect(JSON.stringify(contexto)).not.toContain('ana@club.es');
    });

    it('a code failure without status is reported too', async () => {
      const registraElFallo = await carga();
      const error = new TypeError('Cannot read properties of undefined');

      registraElFallo('panel', 'Error:', error);

      expect(captureError).toHaveBeenCalledWith(error, {
        level: 'warning',
        tags: { fallo: 'panel' },
        fingerprint: ['registraElFallo', 'panel'],
      });
    });

    it('at most one event per site per minute', async () => {
      vi.useFakeTimers();
      const registraElFallo = await carga();

      registraElFallo('panel', 'x', http(500));
      registraElFallo('panel', 'x', http(500));
      registraElFallo('otro', 'x', http(500));
      expect(captureError).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(60_000);
      registraElFallo('panel', 'x', http(500));
      expect(captureError).toHaveBeenCalledTimes(3);
    });

    it.each([
      ['a 4xx (a business rejection)', http(409)],
      [
        'an offline failure',
        Object.assign(new TypeError('x'), { sinConexion: true }),
      ],
    ])('%s is not reported', async (_caso, error) => {
      const registraElFallo = await carga();

      registraElFallo('panel', 'x', error);

      expect(captureError).not.toHaveBeenCalled();
    });

    it('without an Error, a message with the site only', async () => {
      const registraElFallo = await carga();

      registraElFallo('panel', 'Something odd for', 'ana@club.es');

      expect(captureError).toHaveBeenCalledWith('Fallo en panel', {
        level: 'warning',
        tags: { fallo: 'panel' },
        fingerprint: ['registraElFallo', 'panel'],
      });
    });

    it('a failing Sentry never breaks the catch that called it', async () => {
      captureError.mockImplementationOnce(() => {
        throw new Error('sentry down');
      });
      const registraElFallo = await carga();

      expect(() => registraElFallo('panel', 'x', http(500))).not.toThrow();
    });
  });
});
