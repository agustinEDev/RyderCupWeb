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
      expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
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

    it('a 5xx that only travels in .response is reported, with its status', async () => {
      const registraElFallo = await carga();
      const error = Object.assign(new Error('Failed to refresh token'), {
        response: { status: 502 },
      });

      registraElFallo('sesion', 'x', error);

      expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
        level: 'warning',
        tags: { fallo: 'sesion', status: '502' },
        fingerprint: ['registraElFallo', 'sesion'],
      });
    });

    it('never sends the original message: only the site and the kind of error', async () => {
      const registraElFallo = await carga();
      // El JSON.parse de AuthContext cita un trozo de lo guardado
      const error = new SyntaxError(
        'Unexpected token in JSON at position 3: {"email":"ana@club.es","name":"Ana"}',
      );

      registraElFallo(
        'AuthContext.parse',
        'Failed to parse stored user:',
        error,
      );

      const [enviado, contexto] = captureError.mock.calls[0];
      expect(enviado).toBeInstanceOf(Error);
      expect(enviado.message).toBe('Fallo en AuthContext.parse (SyntaxError)');
      expect(enviado.name).toBe('SyntaxError');
      const todo = JSON.stringify({
        message: enviado.message,
        stack: enviado.stack,
        contexto,
      });
      expect(todo).not.toContain('ana@club.es');
      expect(todo).not.toContain('Ana');
    });

    it('keeps the stack frames of the original, without its header', async () => {
      const registraElFallo = await carga();
      const error = http(500);
      error.stack =
        'Error: Internal Server Error para ana@club.es\n    at carga (x.js:1:1)';

      registraElFallo('panel', 'x', error);

      const [enviado] = captureError.mock.calls[0];
      expect(enviado.stack).toBe(
        'Error: Fallo en panel (Error)\n    at carga (x.js:1:1)',
      );
    });

    it('a multi-line message leaves none of its lines in the stack', async () => {
      const registraElFallo = await carga();
      const error = http(500);
      error.message = 'Fallo para Ana\nana@club.es\n612 345 678';
      error.stack =
        'Error: Fallo para Ana\nana@club.es\n612 345 678\n    at carga (x.js:1:1)\n    at panel (y.js:2:2)';

      registraElFallo('panel', 'x', error);

      const [enviado] = captureError.mock.calls[0];
      expect(enviado.stack).toBe(
        'Error: Fallo en panel (Error)\n    at carga (x.js:1:1)\n    at panel (y.js:2:2)',
      );
    });

    it('a Safari or Firefox stack (no message, frames with @) keeps every frame', async () => {
      const registraElFallo = await carga();
      const error = http(500);
      error.stack =
        'carga@https://www.x.com/a.js:1:1\npanel@https://www.x.com/b.js:2:2';

      registraElFallo('panel', 'x', error);

      const [enviado] = captureError.mock.calls[0];
      expect(enviado.stack).toBe(
        'Error: Fallo en panel (Error)\n    at carga (https://www.x.com/a.js:1:1)\n    at panel (https://www.x.com/b.js:2:2)',
      );
    });

    it('a header whose message changed after the stack was taken is dropped whole', async () => {
      const registraElFallo = await carga();
      const error = http(500);
      error.message = 'Otro texto';
      error.stack =
        'Error: Sin plaza para ana@club.es\nana@club.es\n    at carga (x.js:1:1)';

      registraElFallo('panel', 'x', error);

      const [enviado] = captureError.mock.calls[0];
      expect(enviado.stack).toBe(
        'Error: Fallo en panel (Error)\n    at carga (x.js:1:1)',
      );
    });

    it('a subclass that renamed itself after the stack was taken loses its message too', async () => {
      const registraElFallo = await carga();
      const error = http(422);
      error.status = 500;
      error.name = 'ApiError';
      error.message = 'Sin plaza para ana@club.es';
      error.stack =
        'Error: Sin plaza para ana@club.es\n    at carga (x.js:1:1)';

      registraElFallo('panel', 'x', error);

      const [enviado] = captureError.mock.calls[0];
      expect(enviado.stack).not.toContain('ana@club.es');
      expect(enviado.stack).toContain('    at carga (x.js:1:1)');
    });

    it.each([
      [
        'an email and a time in the header',
        'Error: Aviso a pepe@gmail.com a las 10:30:45\n    at f (x.js:1:1)',
      ],
      [
        'a message line that starts with «at»',
        'Error: datos\n    at casa de ana@club.es\n    at f (x.js:1:1)',
      ],
    ])(
      'a changed header that looks like a frame (%s) is still dropped',
      async (_caso, stack) => {
        const registraElFallo = await carga();
        const error = http(500);
        error.message = 'otro';
        error.stack = stack;

        registraElFallo('panel', 'x', error);

        const [enviado] = captureError.mock.calls[0];
        expect(enviado.stack).toBe(
          'Error: Fallo en panel (Error)\n    at f (x.js:1:1)',
        );
      },
    );

    it.each([
      [
        'the message inside a frame',
        'panel',
        'carga@https://x/a.js:1:1\npanel@https://x/b.js:2:2\nglobal code@https://x/c.js:3:3',
        '    at carga (https://x/a.js:1:1)\n    at panel (https://x/b.js:2:2)\n    at global code (https://x/c.js:3:3)',
      ],
      [
        'native code first',
        'Unexpected token',
        'parse@[native code]\ncarga@https://x/a.js:1:1',
        '    at parse ([native code])\n    at carga (https://x/a.js:1:1)',
      ],
      [
        'Firefox async frames and a trailing newline',
        'x',
        'carga@https://x/a.js:1:1\nasync*panel@https://x/b.js:2:2\n',
        '    at carga (https://x/a.js:1:1)\n    at async*panel (https://x/b.js:2:2)',
      ],
    ])(
      'a Safari or Firefox stack keeps every frame (%s)',
      async (_caso, message, stack, marcos) => {
        const registraElFallo = await carga();
        const error = http(500);
        error.message = message;
        error.stack = stack;

        registraElFallo('panel', 'x', error);

        const [enviado] = captureError.mock.calls[0];
        expect(enviado.stack).toBe(`Error: Fallo en panel (Error)\n${marcos}`);
      },
    );

    it.each([
      [
        'an email followed by line:col',
        'Error: fallo de ana@club.es:12:30\nTel 612 345 678\n    at f (https://x/a.js:1:1)',
      ],
      [
        'an @ before a URL',
        'Error: fallo @ https://api.x.com/u/ana:1:2\n    at f (https://x/a.js:1:1)',
      ],
      [
        'a frame-like line followed by text',
        'Error: datos\nana@club.es:1:2\nTel 612 345 678\n    at f (https://x/a.js:1:1)',
      ],
    ])(
      'message text that looks like a location never leaves (%s)',
      async (_caso, stack) => {
        const registraElFallo = await carga();
        const error = http(500);
        error.message = 'otro';
        error.stack = stack;

        registraElFallo('panel', 'x', error);

        const [enviado] = captureError.mock.calls[0];
        expect(enviado.stack).toBe(
          'Error: Fallo en panel (Error)\n    at f (https://x/a.js:1:1)',
        );
      },
    );

    it('V8 async and anonymous frames are kept', async () => {
      const registraElFallo = await carga();
      const error = http(500);
      error.stack =
        'Error: Internal Server Error\n    at async carga (https://x/a.js:1:1)\n    at https://x/b.js:2:2\n    at JSON.parse (<anonymous>)';

      registraElFallo('panel', 'x', error);

      const [enviado] = captureError.mock.calls[0];
      expect(enviado.stack).toBe(
        'Error: Fallo en panel (Error)\n    at async carga (https://x/a.js:1:1)\n    at https://x/b.js:2:2\n    at JSON.parse (<anonymous>)',
      );
    });

    it.each([
      [
        'an empty message',
        '',
        'Error\n    at f (x.js:1:1)',
        '\n    at f (x.js:1:1)',
      ],
      ['a stack without frames', 'texto', 'Error: texto de ana@club.es', ''],
    ])('%s', async (_caso, message, stack, cola) => {
      const registraElFallo = await carga();
      const error = http(500);
      error.message = message;
      error.stack = stack;

      registraElFallo('panel', 'x', error);

      const [enviado] = captureError.mock.calls[0];
      expect(enviado.stack).toBe(`Error: Fallo en panel (Error)${cola}`);
    });

    it('a very long line is never a frame and does not hang', async () => {
      const registraElFallo = await carga();
      const error = http(500);
      error.message = 'otro';
      error.stack = `Error: ${'@:1:1 '.repeat(10_000)}\n    at f (x.js:1:1)`;

      const antes = Date.now();
      registraElFallo('panel', 'x', error);

      expect(Date.now() - antes).toBeLessThan(200);
      const [enviado] = captureError.mock.calls[0];
      expect(enviado.stack).toBe(
        'Error: Fallo en panel (Error)\n    at f (x.js:1:1)',
      );
    });

    it('a non-Error rejection without network is not reported', async () => {
      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: false,
        configurable: true,
      });
      try {
        const registraElFallo = await carga();
        registraElFallo('panel', 'Something odd', 'sin error');
        expect(captureError).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(globalThis.navigator, 'onLine', {
          value: true,
          configurable: true,
        });
      }
    });

    it('a code failure without status is reported too', async () => {
      const registraElFallo = await carga();
      const error = new TypeError('Cannot read properties of undefined');

      registraElFallo('panel', 'Error:', error);

      expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
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
      // Cierres de sesión de rutina: ya los cuenta avisaASentryDelCierre
      [
        'a refresh rejected (401 in .response)',
        Object.assign(new Error('Refresh token expired'), {
          response: { status: 401 },
        }),
      ],
      [
        'a revoked device (401 in .response)',
        Object.assign(new Error('Device revoked'), {
          response: { status: 401 },
          errorData: { detail: 'Dispositivo revocado' },
        }),
      ],
      [
        'the CSRF logout (no status, its code)',
        Object.assign(new Error('CSRF validation failed'), {
          errorCode: 'CSRF_VALIDATION_FAILED',
        }),
      ],
      [
        'a replaced session (code in errorData)',
        Object.assign(new Error('x'), {
          errorData: { error_code: 'SESSION_REPLACED' },
        }),
      ],
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
