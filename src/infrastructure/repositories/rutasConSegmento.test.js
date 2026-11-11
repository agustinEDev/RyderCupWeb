import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Ningún id entra a pelo en una ruta de la API (FE-03, C4, fase 4 del plan a 9).
 *
 * Recorre los repositorios y las demás piezas que construyen rutas de la API, busca cada
 * plantilla que empieza por `/api` y exige que todo lo que se interpola en la parte de la
 * ruta (antes del `?`) pase por `segmento(...)`. La parte de la búsqueda (`?…`) solo puede
 * venir de un constructor de búsquedas conocido. Si alguien añade una ruta con `${id}` a
 * pelo, este test falla y dice dónde.
 */
const RAIZ = globalThis.process.cwd();
const DIRECTORIOS = ['src/infrastructure/repositories'];
const FICHEROS = ['src/components/ui/Avatar.jsx'];

// El sufijo de búsqueda que construye el propio repositorio («?…» o nada): solo como
// última pieza de la plantilla y sin nada detrás
const SUFIJO_DE_BUSQUEDA = [/^queryString$/, /^query$/, /^this\.#buildQuery\(/, /^version \? `\?v=/];

// Lo que puede ir en la parte de la búsqueda: lo construyen URLSearchParams o encodeURIComponent
const BUSQUEDA_PERMITIDA = [
  /^queryString\b/,
  /^params\.toString\(\)$/,
  /^queryParams\.toString\(\)/,
  /^this\.#buildQuery\(/,
  /^encodeURIComponent\(/,
  /^version \?/,
];

/** Las plantillas `…` que empiezan por /api, con sus interpolaciones de primer nivel. */
const plantillas = (fuente) => {
  const out = [];
  for (let i = 0; i < fuente.length; i++) {
    if (fuente[i] !== '`') continue;
    // Solo las que abren una ruta de la API (directa, o tras la base de la API)
    const resto = fuente.slice(i + 1);
    const empieza = resto.startsWith('/api') || resto.startsWith('${getApiBaseUrl()}/api');
    let j = i + 1;
    let texto = '';
    const partes = [];
    while (j < fuente.length && fuente[j] !== '`') {
      if (fuente[j] === '\\') { texto += fuente[j] + fuente[j + 1]; j += 2; continue; }
      if (fuente[j] === '$' && fuente[j + 1] === '{') {
        let nivel = 1; let k = j + 2;
        while (k < fuente.length && nivel > 0) {
          if (fuente[k] === '{') nivel++;
          else if (fuente[k] === '}') nivel--;
          k++;
        }
        partes.push({ expresion: fuente.slice(j + 2, k - 1).trim(), antes: texto, alFinal: fuente[k] === '`' });
        texto += '\u0000';
        j = k;
        continue;
      }
      texto += fuente[j];
      j++;
    }
    if (empieza) out.push({ desde: i, partes });
    i = j;
  }
  return out;
};

const ficheros = () => [
  ...DIRECTORIOS.flatMap((d) =>
    readdirSync(resolve(RAIZ, d))
      .filter((f) => /\.(js|jsx)$/.test(f) && !f.includes('.test.'))
      .map((f) => join(d, f)),
  ),
  ...FICHEROS,
];

describe('rutas de la API con segmento (FE-03, C4)', () => {
  it('todo lo que entra en la ruta pasa por segmento(); la búsqueda, por un constructor conocido', () => {
    const malas = [];
    for (const fichero of ficheros()) {
      const fuente = readFileSync(resolve(RAIZ, fichero), 'utf8');
      for (const { desde, partes } of plantillas(fuente)) {
        const linea = fuente.slice(0, desde).split('\n').length;
        for (const { expresion, antes, alFinal } of partes) {
          if (expresion === 'getApiBaseUrl()') continue;
          const enLaBusqueda = antes.includes('?');
          const sufijo = alFinal && SUFIJO_DE_BUSQUEDA.some((r) => r.test(expresion));
          const vale = enLaBusqueda
            ? BUSQUEDA_PERMITIDA.some((r) => r.test(expresion))
            : expresion.startsWith('segmento(') || sufijo || BUSQUEDA_PERMITIDA.some((r) => r.test(expresion) && /\?/.test(expresion));
          if (!vale) malas.push(`${fichero}:${linea} \${${expresion}}`);
        }
      }
    }
    expect(malas).toEqual([]);
  });

  it('el analizador ve las rutas: hay decenas de segmentos en los repositorios', () => {
    let segmentos = 0;
    for (const fichero of ficheros()) {
      const fuente = readFileSync(resolve(RAIZ, fichero), 'utf8');
      for (const { partes } of plantillas(fuente)) segmentos += partes.filter((p) => p.expresion.startsWith('segmento(')).length;
    }
    expect(segmentos).toBeGreaterThan(100);
  });
});
