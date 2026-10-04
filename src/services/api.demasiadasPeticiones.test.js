import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Un 429 llegaba a la pantalla con el texto técnico del backend, en inglés:
 * «Rate limit exceeded: 10 per 1 minute». Se cambia en el origen por el texto
 * de la app (Agustín, 4 oct 2026), y el error sigue llevando su `status`: la
 * cola de anotaciones y las pantallas de contraseña lo reconocen por él.
 */

const llamarAlBackend = vi.fn();
vi.mock('../utils/tokenRefreshInterceptor', () => ({
  fetchWithTokenRefresh: (...args) => llamarAlBackend(...args),
}));
vi.mock('../contexts/csrfTokenSync', () => ({ getCsrfToken: () => 'csrf' }));
vi.mock('i18next', () => ({ default: { t: (clave) => `t(${clave})` } }));

import comunEs from '../i18n/locales/es/common.json';
import comunEn from '../i18n/locales/en/common.json';

const { apiRequest } = await import('./api');

const respuesta = (status, cuerpo) => ({
  ok: false,
  status,
  statusText: 'x',
  json: async () => cuerpo,
});

describe('apiRequest · demasiadas peticiones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('R1: un 429 dice el texto de la app, no el del backend', async () => {
    llamarAlBackend.mockResolvedValue(
      respuesta(429, { error: 'Rate limit exceeded: 10 per 1 minute' })
    );

    const error = await apiRequest('/api/v1/competitions/c-1', { method: 'PUT' }).catch((e) => e);

    expect(error.message).toBe('t(common:demasiadasPeticiones)');
    expect(error.status).toBe(429);
  });

  it('R2: los demás errores siguen con el texto del servidor', async () => {
    llamarAlBackend.mockResolvedValue(respuesta(400, { detail: 'Quita antes los campos de ES' }));

    const error = await apiRequest('/api/v1/competitions/c-1', { method: 'PUT' }).catch((e) => e);

    expect(error.message).toBe('Quita antes los campos de ES');
    expect(error.status).toBe(400);
  });

  // El 429 sale también en el login, el registro y las lecturas: el texto no
  // habla de «cambios» (revisión local de la PR; Agustín, 4 oct 2026)
  it.each([
    ['es', comunEs, 'Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.'],
    ['en', comunEn, 'Too many attempts in a row. Wait a minute and try again.'],
  ])('R3: en %s el texto es neutro', (_, comun, texto) => {
    expect(comun.demasiadasPeticiones).toBe(texto);
  });
});
