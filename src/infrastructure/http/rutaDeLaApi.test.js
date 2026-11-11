import { describe, it, expect } from 'vitest';
import { segmento, valeComoSegmento, RutaDeLaApiNoValida, esRutaDeLaApiSegura } from './rutaDeLaApi';

/**
 * Los ids que acaban en la ruta de la API (FE-03, fase 4 del plan a 9). Muchos salen de
 * la dirección (`useParams`), así que un enlace preparado podría colar `..` o `/` y hacer
 * que el navegador llamara a otra ruta con las cookies y el token CSRF (CSPT).
 *
 *   C1 cada id se codifica: `?`, `#`, `%` y espacios no cambian la ruta
 *   C2 `.` o `..` no vale: el navegador los resuelve como «aquí» y «arriba». Uno vacío,
 *      null o undefined sale como antes (`/x//y`, `/x/undefined/y`): el servidor contesta
 *      404 y las pantallas ya lo tratan (code-review, 11 nov 2026)
 *   C3 la ruta final: solo de la API, sin `..` ni `.` (tampoco `%2e`), sin `//` delante
 *   C4 `/` o `\` en un valor no vale: el servidor (Uvicorn) decodifica `%2F` antes de
 *      enrutar, así que un id con `/` añadía tramos a la ruta (probador, 11 nov 2026)
 */
const UUID = '0b5a6c1e-2d3f-4a5b-8c7d-9e0f1a2b3c4d';

describe('segmento (C1, C2)', () => {
  it.each([
    [UUID, UUID],
    [7, '7'],
    ['ES', 'ES'],
    ['a b', 'a%20b'],
    ['x?admin=1', 'x%3Fadmin%3D1'],
    ['x#y', 'x%23y'],
    ['%2e%2e', '%252e%252e'],
    ['%2F', '%252F'],
  ])('C1 %j → %j', (valor, esperado) => {
    expect(segmento(valor)).toBe(esperado);
  });

  it.each([['a/b'], ['a\\b'], ['/'], ['//'], ['../admin'], ['x/../../admin'], ['G/players/U/no-show?']])(
    'C4 %j no vale: la barra, aunque vaya codificada, el servidor la toma como separador',
    (valor) => {
      expect(() => segmento(valor)).toThrow(RutaDeLaApiNoValida);
      expect(valeComoSegmento(valor)).toBe(false);
    },
  );

  it.each([['?', '%3F'], ['#', '%23'], ['%2F', '%252F'], ['%5C', '%255C']])('C4 %j sí vale: %j', (valor, esperado) => {
    expect(segmento(valor)).toBe(esperado);
  });

  it.each([['.'], ['..']])('C2 %j no vale', (valor) => {
    expect(() => segmento(valor)).toThrow(RutaDeLaApiNoValida);
    expect(valeComoSegmento(valor)).toBe(false);
  });

  it.each([['', ''], [null, 'null'], [undefined, 'undefined']])('C2 %j sale como antes: %j', (valor, esperado) => {
    expect(segmento(valor)).toBe(esperado);
    expect(valeComoSegmento(valor)).toBe(true);
  });
});

describe('esRutaDeLaApiSegura (C3)', () => {
  it.each([
    `/api/v1/competitions/${UUID}`,
    `/api/v1/competitions/${UUID}/rounds?x=1&y=%2E%2E`,
    '/api/v1/users/search?q=Jos%C3%A9',
    '/api/v1/golf-courses?name=a/b',
    // En la búsqueda, «/../» es texto: no se resuelve
    '/api/v1/golf-courses?q=/../x',
    // En la búsqueda, una barra codificada es solo texto
    '/api/v1/golf-courses?q=a%2Fb%5Cc',
    // Un valor «%2F» pasado por segmento: %252F, que el servidor no convierte en barra
    '/api/v1/users/%252F/avatar',
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
    // Una barra codificada en la ruta: el servidor la decodifica antes de enrutar
    '/api/v1/users/x%2Fme%2Fdevices/avatar',
    '/api/v1/users/x%2fy',
    '/api/v1/users/x%5Cy',
    '/api/v1/users/x%5cy',
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
