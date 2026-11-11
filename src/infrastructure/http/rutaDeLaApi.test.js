import { describe, it, expect } from 'vitest';
import { segmento, RutaDeLaApiNoValida, esRutaDeLaApiSegura } from './rutaDeLaApi';

/**
 * Los ids que acaban en la ruta de la API (FE-03, fase 4 del plan a 9). Muchos salen de
 * la dirección (`useParams`), así que un enlace preparado podría colar `..` o `/` y hacer
 * que el navegador llamara a otra ruta con las cookies y el token CSRF (CSPT).
 *
 *   C1 cada id se codifica: `/`, `?`, `#`, `%` y espacios no cambian la ruta
 *   C2 un id vacío, `.` o `..` no vale: el navegador los resuelve como «aquí» y «arriba»
 *   C3 la ruta final: solo de la API, sin `..` ni `.` (tampoco `%2e`), sin `//` delante
 */
const UUID = '0b5a6c1e-2d3f-4a5b-8c7d-9e0f1a2b3c4d';

describe('segmento (C1, C2)', () => {
  it.each([
    [UUID, UUID],
    [7, '7'],
    ['ES', 'ES'],
    ['a b', 'a%20b'],
    ['../admin', '..%2Fadmin'],
    ['x/y', 'x%2Fy'],
    ['x?admin=1', 'x%3Fadmin%3D1'],
    ['x#y', 'x%23y'],
    ['%2e%2e', '%252e%252e'],
    ['%2F', '%252F'],
  ])('C1 %j → %j', (valor, esperado) => {
    expect(segmento(valor)).toBe(esperado);
  });

  it.each([['.'], ['..'], [''], [null], [undefined]])('C2 %j no vale', (valor) => {
    expect(() => segmento(valor)).toThrow(RutaDeLaApiNoValida);
  });
});

describe('esRutaDeLaApiSegura (C3)', () => {
  it.each([
    `/api/v1/competitions/${UUID}`,
    `/api/v1/competitions/${UUID}/rounds?x=1&y=%2E%2E`,
    '/api/v1/users/search?q=Jos%C3%A9',
    '/api/v1/golf-courses?name=a/b',
    '/api/v1/users/a%2Fb/avatar',
    // En la búsqueda, «/../» es texto: no se resuelve
    '/api/v1/golf-courses?q=/../x',
  ])('vale %s', (ruta) => {
    expect(esRutaDeLaApiSegura(ruta)).toBe(true);
  });

  it.each([
    '/api/v1/competitions/../admin/users',
    '/api/v1/competitions/./x',
    '/api/v1/competitions/%2e%2e/admin',
    '/api/v1/competitions/%2E%2E/admin',
    '/api/v1/competitions/.%2e/admin',
    '/api/v1/competitions/%2e./admin',
    '/api/v1/competitions/%2e/x',
    '//evil.example/api/v1/x',
    '/\\evil.example/x',
    // El navegador trata «\\» como «/» en la ruta: esto acabaría en /api/admin
    '/api/v1/competitions\\..\\..\\admin',
    // El navegador borra tabuladores y saltos de línea antes de resolver la ruta: «.\t.»
    // acaba siendo «..» (revisor, 11 nov 2026)
    '/api/v1/competitions/groups/.\t./scoring-view',
    '/api/v1/a/%2e\r%2e/b',
    '/api/v1/a/.\n./b',
    '/api/v1/a/\u0000/b',
    '/api/v1/a/\u007f/b',
    // También en la búsqueda: un salto de línea en la dirección no sale
    '/api/v1/x?q=a\nb',
    'https://evil.example/api/v1/x',
    'http://api.rydercupfriends.com/api/v1/x',
    'api/v1/x',
    '/admin/users',
    '/api/v1/x#frag',
    '/api/v1/x?q=1#frag',
    '',
  ])('no vale %s', (ruta) => {
    expect(esRutaDeLaApiSegura(ruta)).toBe(false);
  });

  it('no vale lo que no es texto', () => {
    expect(esRutaDeLaApiSegura(null)).toBe(false);
    expect(esRutaDeLaApiSegura({ toString: () => '/api/v1/x' })).toBe(false);
  });
});
