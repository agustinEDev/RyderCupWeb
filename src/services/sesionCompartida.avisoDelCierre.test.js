import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Entrar con éxito olvida el aviso de un cierre forzado que quedara guardado: si
 * /login no llegó a enseñarlo, no puede salir más tarde, en otro /login.
 *
 * | Caso                                                  | Aviso guardado  |
 * |-------------------------------------------------------|-----------------|
 * | se anota la sesión al entrar (anotaLaSesion)          | olvidado        |
 * | el servidor confirma la sesión (consultaLaSesion)     | olvidado        |
 * | queda guardado, se entra y se sale con el botón       | no sale el viejo (useLogout.test) |
 */
const { anotaLaSesion, consultaLaSesion, reiniciaLaSesionCompartida } =
  await import('./sesionCompartida');
const { guardaElAvisoDelCierre, tomaElAvisoDelCierre } =
  await import('../utils/avisoTrasElCierre');

describe('entrar olvida el aviso de un cierre forzado', () => {
  beforeEach(() => {
    reiniciaLaSesionCompartida();
    globalThis.sessionStorage.clear();
  });

  it('al anotar la sesión de quien acaba de entrar', () => {
    guardaElAvisoDelCierre('revocation');

    anotaLaSesion({ id: 'u-1', email: 'ana@example.com' });

    expect(tomaElAvisoDelCierre()).toBeNull();
  });

  it('cuando el servidor confirma la sesión', async () => {
    guardaElAvisoDelCierre('expiration');
    const fetchOriginal = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'u-1' }),
    });
    try {
      await consultaLaSesion();
    } finally {
      globalThis.fetch = fetchOriginal;
    }

    expect(tomaElAvisoDelCierre()).toBeNull();
  });
});
