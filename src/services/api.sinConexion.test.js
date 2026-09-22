import { describe, it, expect, beforeEach, vi } from 'vitest';

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
const { esFalloDeRed, mensajeDeError } = await import('../utils/sinCobertura');

describe('apiRequest · sin conexión (FE #685)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
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

  it('C4: un fallo que no es de la llamada de red no se disfraza de falta de cobertura', async () => {
    // Una respuesta 200 cuyo cuerpo no se puede leer es un fallo de otro tipo
    llamarAlBackend.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new TypeError('body stream already read');
      },
    });

    const error = await apiRequest('/api/v1/invitations/me').catch((e) => e);

    expect(error.message).toBe('body stream already read');
  });

  it('C5: un error de la llamada que no es de red pasa sin tocar', async () => {
    // El interceptor lanza sus propios errores, por ejemplo al caducar la sesión
    const deSesion = Object.assign(new Error('Session expired'), { status: 401 });
    llamarAlBackend.mockRejectedValue(deSesion);

    const error = await apiRequest('/api/v1/invitations/me').catch((e) => e);

    expect(error).toBe(deSesion);
  });
});
