import { describe, it, expect } from 'vitest';

/**
 * La respuesta cruda de la API no sale de infraestructura.
 *
 * Hasta el 20 nov 2026 los repositorios de competiciones, inscripciones,
 * amistades e invitaciones colgaban la respuesta tal cual en la entidad del
 * dominio (`_apiData`) y los assemblers leían de ahí campos en snake_case: el
 * dominio cargaba datos de infraestructura y la capa de aplicación conocía la
 * forma exacta de la API. Ahora el repositorio devuelve `{ entity, extras }` y
 * `extras` lo traduce a camelCase la infraestructura (`aExtras`). Este test lee el
 * código para que no vuelva a colarse.
 *
 *   #   | qué                                                  | dónde
 *   ----|------------------------------------------------------|-----------------
 *   G1  | nadie cuelga ni lee `_apiData`                       | todo `src`
 *   G2  | la capa de aplicación no recibe la respuesta cruda   | `src/application`
 *       | (`apiData`, `apiDataArray`)                          |
 *   G3  | un assembler no lee claves snake_case (`x.foo_bar`,  | assemblers
 *       | `x?.foo_bar`, `x['foo_bar']`, `x[\`${lado}_alias\`]`, |
 *       | `const { foo_bar } = x`)                             |
 *
 * Las claves snake_case que un assembler ESCRIBE en su DTO (`name_en:`,
 * `first_name:`) no son lecturas y no cuentan.
 */
const todoSrc = import.meta.glob(
  ['/src/**/*.{js,jsx}', '!/src/**/*.test.{js,jsx}'],
  { query: '?raw', import: 'default', eager: true },
);

const enAplicacion = Object.entries(todoSrc).filter(([ruta]) =>
  ruta.startsWith('/src/application/'),
);
const assemblers = enAplicacion.filter(([ruta]) =>
  ruta.startsWith('/src/application/assemblers/'),
);

// El código sin comentarios de bloque ni de línea. Un `//` tras `:` es una URL
// dentro de un texto, no un comentario
const sinComentarios = (codigo) =>
  codigo
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((linea) => linea.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');

// Lo que casa, buscado sobre el código entero: una desestructuración o un
// corchete que Prettier parte en varias líneas también cuenta (CodeRabbit)
const coincidencias = (codigo, patron) =>
  [...sinComentarios(codigo).matchAll(new RegExp(patron.source, 'g'))].map(
    ([texto]) => texto.replace(/\s+/g, ' '),
  );

const hallazgos = (ficheros, patron) =>
  ficheros.flatMap(([ruta, codigo]) =>
    coincidencias(codigo, patron).map((texto) => `${ruta}: ${texto}`),
  );

const LECTURA_SNAKE = /\??\.[a-z][a-z0-9]*_[a-z0-9_]+\b/;
const PLANTILLA_SNAKE = /\[`\$\{[^}]+\}_[a-z]/;
const CORCHETE_SNAKE = /\[\s*['"`][a-z][a-z0-9]*_[a-z0-9_]+['"`]\s*\]/;
const DESESTRUCTURA_SNAKE =
  /(?:const|let|var)\s*\{[^}]*\b[a-z][a-z0-9]*_[a-z0-9_]+\b[^}]*\}\s*=/;

describe('la respuesta cruda de la API no sale de infraestructura', () => {
  it('lee los ficheros (si no, el resto no prueba nada)', () => {
    expect(Object.keys(todoSrc).length).toBeGreaterThan(500);
    expect(assemblers.length).toBeGreaterThanOrEqual(5);
  });

  it('G1: nadie cuelga ni lee `_apiData`', () => {
    expect(hallazgos(Object.entries(todoSrc), /_apiData\b/)).toEqual([]);
  });

  it('G2: la capa de aplicación no recibe la respuesta cruda', () => {
    expect(hallazgos(enAplicacion, /\bapiData(Array)?\b/)).toEqual([]);
  });

  it('G3: un assembler no lee claves snake_case', () => {
    expect(hallazgos(assemblers, LECTURA_SNAKE)).toEqual([]);
    expect(hallazgos(assemblers, PLANTILLA_SNAKE)).toEqual([]);
    expect(hallazgos(assemblers, CORCHETE_SNAKE)).toEqual([]);
    expect(hallazgos(assemblers, DESESTRUCTURA_SNAKE)).toEqual([]);
  });

  it.each([
    ['competition._apiData = apiData;', /_apiData\b/, true],
    ['const x = apiData?.creator;', /\bapiData(Array)?\b/, true],
    ['const n = extras.user_name;', LECTURA_SNAKE, true],
    ['const n = extras?.user_name;', LECTURA_SNAKE, true],
    ['const a = datos[`${lado}_alias`];', PLANTILLA_SNAKE, true],
    ['  name_en: pais.nameEn,', LECTURA_SNAKE, false],
    ['  first_name: extras.firstName,', LECTURA_SNAKE, false],
    ['const n = extras.userName;', LECTURA_SNAKE, false],
    ['// antes: apiData.user_name', /\bapiData(Array)?\b/, false],
    ["const n = extras['user_name'];", CORCHETE_SNAKE, true],
    ["const n = extras?.['user_name'];", CORCHETE_SNAKE, true],
    ["const n = extras['userName'];", CORCHETE_SNAKE, false],
    ['const { user_name } = extras;', DESESTRUCTURA_SNAKE, true],
    ['const { userName, team_a_id: a } = extras;', DESESTRUCTURA_SNAKE, true],
    ['const { userName } = extras;', DESESTRUCTURA_SNAKE, false],
    [
      'const {\n  userName,\n  user_name,\n} = extras;',
      DESESTRUCTURA_SNAKE,
      true,
    ],
    [
      'const {\n  userName,\n  teamId,\n} = extras;',
      DESESTRUCTURA_SNAKE,
      false,
    ],
    ["const n = extras[\n  'user_name'\n];", CORCHETE_SNAKE, true],
    [
      "const url = 'https://x.y/z'; const n = e.user_name;",
      LECTURA_SNAKE,
      true,
    ],
  ])('el patrón ve «%s»: %s', (linea, patron, esperado) => {
    expect(coincidencias(linea, patron).length > 0).toBe(esperado);
  });
});
