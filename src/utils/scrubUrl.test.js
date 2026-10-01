/**
 * Tests del saneado de URLs hacia Sentry (FE #385)
 *
 * La posicion del usuario viaja en la query string de la busqueda por
 * cercania, y de ahi entra en Sentry por tres puertas: breadcrumbs de fetch,
 * spans de rendimiento y la URL del propio evento de error. Redondear en
 * origen reduce el dato; esto lo retira del todo.
 *
 * El modulo esta suelto y sin dependencias porque quien lo usa es `main.jsx`:
 * es ahi donde arranca Sentry y donde los ganchos llegan a registrarse.
 */

import { describe, it, expect } from 'vitest';
import { scrubUrl } from './scrubUrl';

describe('scrubUrl', () => {
  it('retira la posicion de la busqueda por cercania', () => {
    expect(
      scrubUrl('/api/v1/golf-courses?approval_status=APPROVED&limit=20&lat=40.417&lon=-3.704')
    ).toBe('/api/v1/golf-courses?approval_status=APPROVED&limit=20&lat=[REDACTED]&lon=[REDACTED]');
  });

  it('funciona igual con una URL absoluta y con fragmento', () => {
    expect(scrubUrl('https://api.rydercupfriends.com/api/v1/golf-courses?lat=40.417#top')).toBe(
      'https://api.rydercupfriends.com/api/v1/golf-courses?lat=[REDACTED]#top'
    );
  });

  it('sigue tapando los tokens, que es para lo que se escribio', () => {
    expect(scrubUrl('/auth/verify?token=abc123&next=/dashboard')).toBe(
      '/auth/verify?token=[REDACTED]&next=/dashboard'
    );
    expect(scrubUrl('/auth?access_token=abc&refresh_token=def')).toBe(
      '/auth?access_token=[REDACTED]&refresh_token=[REDACTED]'
    );
  });

  it('no toca lo que no es sensible', () => {
    const url = '/api/v1/competitions?status=ACTIVE&limit=20';
    expect(scrubUrl(url)).toBe(url);
  });

  it('no confunde un nombre de parametro que solo lo contiene', () => {
    // `latitude` empieza por `lat` pero no es `lat`
    const url = '/api/v1/courses?latitude_label=x&translation=y';
    expect(scrubUrl(url)).toBe(url);
  });

  // Lo que quedaba fuera (revisión del 30 sep 2026):
  //
  //   #   caso                                          | esperado
  //   ----|---------------------------------------------|------------------------------
  //   R1  el token del correo va en la RUTA             | /reset-password/[REDACTED]
  //   R1b y en la llamada a la API que lo valida        | .../validate-reset-token/[REDACTED]
  //   R2  la ruta sin token, o una que solo se parece   | intacta
  //   R3  la vuelta de Google: code y state             | tapados; error y country_code no
  //   R4  la query suelta, sin ? delante (url.query)    | tapada igual
  //   R5  el token en el fragmento (#access_token=)     | tapado
  it('R1: tapa el token que va en la ruta del restablecimiento', () => {
    expect(scrubUrl('/reset-password/abc123')).toBe('/reset-password/[REDACTED]');
    expect(scrubUrl('https://www.rydercupfriends.com/reset-password/abc123?lang=es#x')).toBe(
      'https://www.rydercupfriends.com/reset-password/[REDACTED]?lang=es#x'
    );
  });

  it('R1b: tapa el token en la llamada que lo valida', () => {
    expect(scrubUrl('https://api.rydercupfriends.com/api/v1/auth/validate-reset-token/abc123')).toBe(
      'https://api.rydercupfriends.com/api/v1/auth/validate-reset-token/[REDACTED]'
    );
  });

  it('R2: no toca la ruta sin token ni una que solo se le parece', () => {
    expect(scrubUrl('/reset-password')).toBe('/reset-password');
    expect(scrubUrl('/reset-password?sent=1')).toBe('/reset-password?sent=1');
    expect(scrubUrl('/forgot-password/help')).toBe('/forgot-password/help');
  });

  it('R3: tapa el code y el state de la vuelta de Google, y deja el resto', () => {
    expect(scrubUrl('/auth/google/callback?code=4/0Ab-x_y&state=nonce123&error=access_denied')).toBe(
      '/auth/google/callback?code=[REDACTED]&state=[REDACTED]&error=access_denied'
    );
    const url = '/api/v1/players?country_code=ES&status=ACTIVE';
    expect(scrubUrl(url)).toBe(url);
  });

  it('R4: tapa una query suelta, sin ? delante', () => {
    expect(scrubUrl('token=abc&page=2')).toBe('token=[REDACTED]&page=2');
    expect(scrubUrl('code=abc')).toBe('code=[REDACTED]');
  });

  it('R5: tapa un token en el fragmento', () => {
    expect(scrubUrl('/cb#access_token=abc&x=1')).toBe('/cb#access_token=[REDACTED]&x=1');
  });

  it('aguanta lo que no es una URL', () => {
    expect(scrubUrl(undefined)).toBeUndefined();
    expect(scrubUrl(null)).toBeNull();
    expect(scrubUrl('')).toBe('');
  });
});
