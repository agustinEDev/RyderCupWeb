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

  it('aguanta lo que no es una URL', () => {
    expect(scrubUrl(undefined)).toBeUndefined();
    expect(scrubUrl(null)).toBeNull();
    expect(scrubUrl('')).toBe('');
  });
});
