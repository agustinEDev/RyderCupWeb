import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * La dirección de una imagen que manda el servidor (FE-11, fase 4 del plan a 9). El
 * `image_url` de los avatares (predefinidos y fotos subidas) se pegaba a la base de la
 * API: con un valor como `@evil.example/x`, la imagen se pedía a otro servidor
 * (`https://api…@evil.example/x`), y las fotos subidas van con credenciales. Ahora solo
 * vale una ruta de la propia API.
 *
 *   I1 una ruta de la API: la dirección completa, en la base de la API
 *   I2 sin base (local, por el proxy): la ruta tal cual
 *   I3 otro servidor, «@…», «//…», «\…», «javascript:», sin «/api/», con «..»: null
 */
const conBase = async (base) => {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', base);
  return import('./rutaDeLaApi');
};
afterEach(() => vi.unstubAllEnvs());

describe('urlDeImagenDeLaApi (FE-11)', () => {
  it('I1 una ruta de la API, en la base de la API', async () => {
    const { urlDeImagenDeLaApi } = await conBase('https://api.rydercupfriends.com');

    expect(urlDeImagenDeLaApi('/api/v1/avatar-presets/3/image')).toBe('https://api.rydercupfriends.com/api/v1/avatar-presets/3/image');
    expect(urlDeImagenDeLaApi('/api/v1/users/me/avatar/uploads/abc/image?v=2')).toBe(
      'https://api.rydercupfriends.com/api/v1/users/me/avatar/uploads/abc/image?v=2',
    );
  });

  it('I2 sin base: la ruta tal cual, como el resto de llamadas en local', async () => {
    const { urlDeImagenDeLaApi } = await conBase('');

    expect(urlDeImagenDeLaApi('/api/v1/avatar-presets/3/image')).toBe('/api/v1/avatar-presets/3/image');
  });

  it.each([
    '@evil.example/x',
    '//evil.example/api/v1/x',
    '/\\evil.example/api/v1/x',
    'https://evil.example/api/v1/x',
    'javascript:alert(1)',
    '/images/x.png',
    '/api/v1/../admin',
    '/api/v1/%2e%2e/admin',
    '',
    null,
    undefined,
    42,
  ])('I3 %j no vale', async (ruta) => {
    const { urlDeImagenDeLaApi } = await conBase('https://api.rydercupfriends.com');

    expect(urlDeImagenDeLaApi(ruta)).toBeNull();
  });
});
