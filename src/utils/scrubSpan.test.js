import { describe, it, expect } from 'vitest';
import { scrubSpan } from './scrubSpan';

/**
 * Sentry 11 cambió la forma de los spans que llegan a `beforeSendSpan`: el texto
 * va en `name` (antes `description`) y los datos en `attributes` (antes `data`),
 * y la URL en `url.full` (antes `http.url`). Los spans de una transacción siguen
 * con la forma antigua. Si el filtro solo mirase una de las dos, los tokens de
 * las URLs volverían a llegar a Sentry (FE #385).
 */
describe('scrubSpan', () => {
  it('forma antigua: tapa description y data.url / data["http.url"]', () => {
    const span = {
      description: 'GET /api/v1/auth/reset?token=abc123',
      data: { url: '/reset?token=abc123', 'http.url': 'https://api.x.com/r?access_token=zz' },
    };
    scrubSpan(span);
    expect(span.description).toBe('GET /api/v1/auth/reset?token=[REDACTED]');
    expect(span.data.url).toBe('/reset?token=[REDACTED]');
    expect(span.data['http.url']).toBe('https://api.x.com/r?access_token=[REDACTED]');
  });

  it('Sentry 11: tapa el name', () => {
    const span = { name: 'GET /api/v1/auth/verify?token=abc123', attributes: {} };
    scrubSpan(span);
    expect(span.name).toBe('GET /api/v1/auth/verify?token=[REDACTED]');
  });

  it('Sentry 11: tapa attributes["url.full"] como texto', () => {
    const span = { name: 'x', attributes: { 'url.full': 'https://api.x.com/v?token=abc' } };
    scrubSpan(span);
    expect(span.attributes['url.full']).toBe('https://api.x.com/v?token=[REDACTED]');
  });

  it('Sentry 11: tapa attributes["url.full"] como objeto { value }', () => {
    const span = {
      name: 'x',
      attributes: { 'url.full': { value: 'https://api.x.com/v?refresh_token=abc', type: 'string' } },
    };
    scrubSpan(span);
    expect(span.attributes['url.full'].value).toBe('https://api.x.com/v?refresh_token=[REDACTED]');
    expect(span.attributes['url.full'].type).toBe('string');
  });

  it('tapa una query suelta, sin ? delante (url.query)', () => {
    const span = { name: 'x', attributes: { 'url.query': 'token=abc&page=2' } };
    scrubSpan(span);
    expect(span.attributes['url.query']).toBe('token=[REDACTED]&page=2');
  });

  it('tapa http.target (ruta con query)', () => {
    const span = { name: 'x', attributes: { 'http.target': '/reset?token=abc' } };
    scrubSpan(span);
    expect(span.attributes['http.target']).toBe('/reset?token=[REDACTED]');
  });

  it('no toca lo que no es sensible ni falla si faltan campos', () => {
    const span = { name: 'GET /api/v1/users/me', attributes: { 'url.full': '/api/v1/users/me?page=2', otra: 1 } };
    const antes = JSON.stringify(span);
    expect(scrubSpan(span)).toBe(span);
    expect(JSON.stringify(span)).toBe(antes);
    expect(scrubSpan({})).toEqual({});
    expect(scrubSpan(undefined)).toBeUndefined();
  });
});
