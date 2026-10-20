import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Sin conexión, el mensaje del navegador llegaba tal cual a 52 toasts
 * («Failed to fetch», «Load failed»…). Se traduce en el origen, sin dejar de
 * ser un `TypeError`: es lo que usa `esFalloDeRed` para reconocer la falta de
 * cobertura (FE #685).
 */

const llamarAlBackend = vi.fn();
vi.mock('../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: (...args) => llamarAlBackend(...args),
}));
vi.mock('../contexts/csrfTokenSync', () => ({ getCsrfToken: () => 'csrf' }));
vi.mock('i18next', () => ({ default: { t: (clave) => `t(${clave})` } }));

const { apiRequest } = await import('./api');
const { esFalloDeRed, esFalloDeRedDeLaApi, mensajeDeError } = await import('../utils/sinCobertura');

describe('apiRequest · sin conexión (FE #685)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // El espía de `console.error` es global: se quita al acabar cada test
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.'])(
    'C1: el aviso del navegador («%s») se cambia por el texto traducido',
    async (delNavegador) => {
      llamarAlBackend.mockRejectedValue(new TypeError(delNavegador));

      await expect(apiRequest('/api/v1/invitations/me')).rejects.toThrow(
        't(common:sinConexion.mensaje)'
      );
    }
  );

  it('C2: sigue siendo un TypeError, así que se sigue reconociendo como falta de red', async () => {
    const original = new TypeError('Failed to fetch');
    llamarAlBackend.mockRejectedValue(original);

    const error = await apiRequest('/api/v1/invitations/me').catch((e) => e);

    expect(error).toBeInstanceOf(TypeError);
    expect(esFalloDeRed(error)).toBe(true);
    expect(error.cause).toBe(original);
    // La marca explícita: es lo que mira la versión estricta
    expect(error.sinConexion).toBe(true);
    expect(esFalloDeRedDeLaApi(error)).toBe(true);
    expect(mensajeDeError(error, { sinConexion: 'sin red', generico: 'otro' })).toBe('sin red');
  });

  it('C3: una respuesta con error del servidor no se toca', async () => {
    llamarAlBackend.mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ detail: 'Ese jugador ya está invitado' }),
    });

    const error = await apiRequest('/api/v1/invitations').catch((e) => e);

    expect(error.message).toBe('Ese jugador ya está invitado');
    expect(error.status).toBe(409);
  });

  // Regla del 21 oct: un TypeError al leer el cuerpo de un 200 es la conexión
  // que se cortó a medias; se trata como el fallo de `fetch`
  it('C4: un TypeError al leer el cuerpo se marca como falta de cobertura', async () => {
    const original = new TypeError('network error');
    llamarAlBackend.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw original;
      },
    });

    const error = await apiRequest('/api/v1/invitations/me').catch((e) => e);

    expect(error).toBeInstanceOf(TypeError);
    expect(error.message).toBe('t(common:sinConexion.mensaje)');
    expect(error.cause).toBe(original);
    expect(error.sinConexion).toBe(true);
    expect(esFalloDeRedDeLaApi(error)).toBe(true);
  });

  it('C4b: un 200 que no es JSON (SyntaxError) NO se marca: hubo respuesta', async () => {
    const original = new SyntaxError('Unexpected token <');
    llamarAlBackend.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw original;
      },
    });

    const error = await apiRequest('/api/v1/invitations/me').catch((e) => e);

    expect(error).toBe(original);
    expect(error.sinConexion).toBeUndefined();
    expect(esFalloDeRedDeLaApi(error)).toBe(false);
  });

  it('C5: un error de la llamada que no es de red pasa sin tocar', async () => {
    // El interceptor lanza sus propios errores, por ejemplo al caducar la sesión
    const deSesion = Object.assign(new Error('Session expired'), { status: 401 });
    llamarAlBackend.mockRejectedValue(deSesion);

    const error = await apiRequest('/api/v1/invitations/me').catch((e) => e);

    expect(error).toBe(deSesion);
    expect(error.sinConexion).toBeUndefined();
  });

  it('C6: un 4xx no se marca sin conexión', async () => {
    llamarAlBackend.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ detail: 'No existe' }),
    });

    const error = await apiRequest('/api/v1/x').catch((e) => e);

    expect(error.sinConexion).toBeUndefined();
    expect(esFalloDeRedDeLaApi(error)).toBe(false);
  });
});
