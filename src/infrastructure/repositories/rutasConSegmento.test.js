import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Ningún valor entra a pelo en una ruta de la API (FE-03, C4, fase 4 del plan a 9).
 *
 * Recorre los repositorios (y las demás piezas que construyen rutas de la API) y revisa
 * TODA plantilla que parezca una ruta: la que empieza por `/`, por `?` o por una constante
 * de ruta (`${BASE}/…`, `${getApiBaseUrl()}/…`). Exige:
 * - en la parte de la ruta (antes del `?`), `segmento(...)`; solo la constante del
 *   principio y un sufijo de búsqueda al final quedan fuera;
 * - en la parte de la búsqueda, `encodeURIComponent(...)` o un constructor conocido
 *   (`URLSearchParams`).
 * Y que `apiRequest` solo se llame desde los repositorios, para que no haya rutas fuera de
 * lo que este test recorre. La primera versión solo miraba las que empezaban por `/api` y
 * se le escapó un repositorio entero con `${BASE}` (revisor, 11 nov 2026).
 */
const RAIZ = globalThis.process.cwd();
const REPOSITORIOS = 'src/infrastructure/repositories';
const FICHEROS_EXTRA = ['src/components/ui/Avatar.jsx'];

// La constante con la que empieza una ruta: BASE, RUTA_…, getApiBaseUrl()
const CONSTANTE_INICIAL = /^(?:[A-Z][A-Z0-9_]*|getApiBaseUrl\(\))$/;
// El sufijo de búsqueda que construye el propio repositorio («?…» o nada), al final
const SUFIJO_DE_BUSQUEDA = [
  /^queryString$/,
  /^query$/,
  /^filtro$/,
  /^this\.#buildQuery\(/,
  /^version \? `\?v=/,
  /^queryString \? `\?\$\{queryString\}` : ''$/,
  /^queryParams\.toString\(\) \? '\?' \+ queryParams : ''$/,
];
// Lo que puede ir en la parte de la búsqueda
const EN_LA_BUSQUEDA = [/^encodeURIComponent\(/, /^queryString$/, /^params\.toString\(\)$/];

/** Todas las plantillas `…` con su texto y sus interpolaciones de primer nivel. */
const plantillas = (fuente) => {
  const out = [];
  for (let i = 0; i < fuente.length; i++) {
    if (fuente[i] !== '`') continue;
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
    out.push({ desde: i, texto, partes });
    i = j;
  }
  return out;
};

/** Si una plantilla parece una ruta: empieza por `/`, por `?` o por una constante de ruta. */
const pareceRuta = ({ texto, partes }) =>
  texto.startsWith('/') ||
  texto.startsWith('?') ||
  (texto.startsWith('\u0000') && CONSTANTE_INICIAL.test(partes[0].expresion) && texto.slice(1).startsWith('/'));

const fuentes = (dir) =>
  readdirSync(resolve(RAIZ, dir)).flatMap((f) => {
    const ruta = join(dir, f);
    if (statSync(resolve(RAIZ, ruta)).isDirectory()) return fuentes(ruta);
    return /\.(js|jsx|ts|tsx)$/.test(f) && !/\.test\./.test(f) ? [ruta] : [];
  });

const malasDe = (ficheros) => {
  const malas = [];
  for (const fichero of ficheros) {
    const fuente = readFileSync(resolve(RAIZ, fichero), 'utf8');
    for (const plantilla of plantillas(fuente)) {
      if (!pareceRuta(plantilla)) continue;
      const linea = fuente.slice(0, plantilla.desde).split('\n').length;
      plantilla.partes.forEach(({ expresion, antes, alFinal }, n) => {
        if (n === 0 && antes === '' && CONSTANTE_INICIAL.test(expresion)) return;
        const enLaBusqueda = plantilla.texto.startsWith('?') || antes.includes('?');
        const vale = enLaBusqueda
          ? EN_LA_BUSQUEDA.some((r) => r.test(expresion))
          : expresion.startsWith('segmento(') || (alFinal && SUFIJO_DE_BUSQUEDA.some((r) => r.test(expresion)));
        if (!vale) malas.push(`${fichero}:${linea} \${${expresion}}`);
      });
    }
  }
  return malas;
};

const ficherosDeRutas = () => [...fuentes(REPOSITORIOS), ...FICHEROS_EXTRA];

describe('rutas de la API con segmento (FE-03, C4)', () => {
  it('en la ruta, segmento(); en la búsqueda, encodeURIComponent o un constructor conocido', () => {
    expect(malasDe(ficherosDeRutas())).toEqual([]);
  });

  it('el analizador ve las rutas, también las que empiezan por una constante (${BASE})', () => {
    let segmentos = 0;
    let conConstante = 0;
    for (const fichero of ficherosDeRutas()) {
      for (const p of plantillas(readFileSync(resolve(RAIZ, fichero), 'utf8')).filter(pareceRuta)) {
        segmentos += p.partes.filter((x) => x.expresion.startsWith('segmento(')).length;
        if (p.texto.startsWith('\u0000')) conConstante++;
      }
    }
    expect(segmentos).toBeGreaterThan(140);
    expect(conConstante).toBeGreaterThan(10);
  });

  it('el analizador caza un valor a pelo tras una constante y en la búsqueda', () => {
    const fuente = "const BASE = '/api/v1/x';\napiRequest(`${BASE}/groups/${groupId}/a?side=${side}`);";
    const p = plantillas(fuente).filter(pareceRuta);
    expect(p).toHaveLength(1);
    expect(p[0].partes.map((x) => x.expresion)).toEqual(['BASE', 'groupId', 'side']);
  });

  it('apiRequest solo se llama desde los repositorios (y su propia capa http)', () => {
    const fuera = fuentes('src')
      .filter((f) => !f.startsWith(REPOSITORIOS) && !f.startsWith('src/infrastructure/http'))
      .filter((f) => /\bapiRequest\(/.test(readFileSync(resolve(RAIZ, f), 'utf8')));
    expect(fuera).toEqual([]);
  });
});
