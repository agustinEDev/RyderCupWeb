import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Como en la app: la respuesta de la interfaz al transporte, registrada antes de nada
import '../../composition/interfazDelTransporte';

/**
 * Re-auditoría Q-FE-06: el error marca si su texto ya es de la app
 * (`mensajeTraducido`) o si es técnico (`mensajeTecnico`: la lista de Pydantic,
 * un objeto en JSON o el «HTTP 500: …»), para que la pantalla no lo enseñe tal cual.
 */

const llamarAlBackend = vi.fn();
vi.mock('./tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: (...args) => llamarAlBackend(...args),
}));
vi.mock('./csrfTokenSync', () => ({
  getCsrfCookie: () => null,
  getCsrfToken: () => 'csrf',
}));
vi.mock('i18next', () => ({ default: { t: (clave) => `t(${clave})` } }));

const { apiRequest } = await import('./api');

const respuesta = (status, cuerpo) => ({
  ok: false,
  status,
  statusText: 'Bad',
  json: async () => cuerpo,
});

const falla = (status, cuerpo) => {
  llamarAlBackend.mockResolvedValue(respuesta(status, cuerpo));
  return apiRequest('/api/v1/competitions/c-1', { method: 'PUT' }).catch(
    (e) => e,
  );
};

describe('apiRequest · qué clase de texto lleva el error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('M1: un 429 lleva el texto de la app, marcado como traducido', async () => {
    const error = await falla(429, { error: 'Rate limit exceeded' });
    expect(error.mensajeTraducido).toBe(true);
    expect(error.mensajeTecnico).toBeFalsy();
  });

  it('M2: un detail en texto no es ni traducido ni técnico', async () => {
    const error = await falla(400, {
      detail: 'Ese jugador ya es participante',
    });
    expect(error.message).toBe('Ese jugador ya es participante');
    expect(error.mensajeTraducido).toBeFalsy();
    expect(error.mensajeTecnico).toBeFalsy();
  });

  it('M3: la lista de Pydantic de un 422 es técnica', async () => {
    const error = await falla(422, {
      detail: [{ msg: 'Field required', loc: ['body', 'name'] }],
    });
    expect(error.message).toBe('Field required');
    expect(error.mensajeTecnico).toBe(true);
  });

  it('M4: un detail que es un objeto sale en JSON, y es técnico', async () => {
    const error = await falla(400, { detail: { campo: 'x' } });
    expect(error.message).toBe('{"campo":"x"}');
    expect(error.mensajeTecnico).toBe(true);
  });

  it('M5: sin texto, el «HTTP …» es técnico', async () => {
    const error = await falla(404, {});
    expect(error.message).toBe('HTTP 404: Bad');
    expect(error.mensajeTecnico).toBe(true);
  });
});
