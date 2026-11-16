import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Como en la app: la respuesta de la interfaz al transporte, registrada antes de nada
import '../../composition/interfazDelTransporte';

/**
 * Un 429 llegaba a la pantalla con el texto técnico del backend, en inglés:
 * «Rate limit exceeded: 10 per 1 minute». Se cambia en el origen por el texto
 * de la app (Agustín, 4 oct 2026), y el error sigue llevando su `status`: la
 * cola de anotaciones y las pantallas de contraseña lo reconocen por él.
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

import comunEs from '../../i18n/locales/es/common.json';
import comunEn from '../../i18n/locales/en/common.json';

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
      respuesta(429, { error: 'Rate limit exceeded: 10 per 1 minute' }),
    );

    const error = await apiRequest('/api/v1/competitions/c-1', {
      method: 'PUT',
    }).catch((e) => e);

    expect(error.message).toBe('t(common:demasiadasPeticiones)');
    expect(error.status).toBe(429);
  });

  it('R2: los demás errores siguen con el texto del servidor', async () => {
    llamarAlBackend.mockResolvedValue(
      respuesta(400, { detail: 'Quita antes los campos de ES' }),
    );

    const error = await apiRequest('/api/v1/competitions/c-1', {
      method: 'PUT',
    }).catch((e) => e);

    expect(error.message).toBe('Quita antes los campos de ES');
    expect(error.status).toBe(400);
  });

  it('R2b: el 503 de imágenes ocupadas llega con el texto del servidor', async () => {
    // Given el servidor está procesando otras imágenes al subir el avatar
    const texto =
      'Ahora mismo se están procesando otras imágenes. Inténtalo de nuevo en unos segundos.';
    llamarAlBackend.mockResolvedValue(
      respuesta(503, { detail: texto, error_code: 'IMAGES_BUSY' }),
    );

    // When se sube
    const error = await apiRequest('/api/v1/users/me/avatar/upload', {
      method: 'POST',
    }).catch((e) => e);

    // Then el error lleva ese texto tal cual, para que la pantalla lo enseñe
    expect(error.message).toBe(texto);
    expect(error.status).toBe(503);
    // Y su código, en la raíz del cuerpo, para traducirlo
    expect(error.errorCode).toBe('IMAGES_BUSY');
  });

  // El 429 sale también en el login, el registro y las lecturas: el texto no
  // habla de «cambios» (revisión local de la PR; Agustín, 4 oct 2026)
  it.each([
    [
      'es',
      comunEs,
      'Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.',
    ],
    ['en', comunEn, 'Too many attempts in a row. Wait a minute and try again.'],
  ])('R3: en %s el texto es neutro', (_, comun, texto) => {
    expect(comun.demasiadasPeticiones).toBe(texto);
  });
});
