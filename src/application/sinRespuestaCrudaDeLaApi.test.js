import { describe, it, expect } from 'vitest';

/**
 * La respuesta cruda de la API no sale de infraestructura.
 *
 * Hasta el 20 nov 2026 los repositorios de competiciones, inscripciones,
 * amistades e invitaciones colgaban la respuesta tal cual en la entidad del
 * dominio (`_apiData`) y los assemblers leían de ahí campos en snake_case: el
 * dominio cargaba datos de infraestructura y la capa de aplicación conocía la
 * forma exacta de la API. Ahora el repositorio devuelve `{ entity, extras }` y
 * `extras` lo traduce a camelCase el mapper (`toExtras`). Este test lee el
 * código para que no vuelva a colarse.
 *
 *   #   | qué                                                  | dónde
 *   ----|------------------------------------------------------|-----------------
 *   G1  | nadie cuelga ni lee `_apiData`                       | todo `src`
 *   G2  | la capa de aplicación no recibe la respuesta cruda   | `src/application`
 *       | (`apiData`, `apiDataArray`)                          |
 *   G3  | un assembler no lee claves snake_case (`x.foo_bar`,  | assemblers
 *       | `x?.foo_bar`, `x[\`${lado}_alias\`]`)                |
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

// Las líneas de código (sin comentarios de línea ni de bloque) que casan
const lineasQueCasan = (codigo, patron) =>
  codigo
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((linea) => linea.replace(/\/\/.*$/, ''))
    .filter((linea) => patron.test(linea));

const hallazgos = (ficheros, patron) =>
  ficheros.flatMap(([ruta, codigo]) =>
    lineasQueCasan(codigo, patron).map((linea) => `${ruta}: ${linea.trim()}`),
  );

const LECTURA_SNAKE = /\??\.[a-z][a-z0-9]*_[a-z0-9_]+\b/;
const PLANTILLA_SNAKE = /\[`\$\{[^}]+\}_[a-z]/;

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
  ])('el patrón ve «%s»: %s', (linea, patron, esperado) => {
    expect(lineasQueCasan(linea, patron).length > 0).toBe(esperado);
  });
});
