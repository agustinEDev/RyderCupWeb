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
 *
 * Desde #1100 también: una ruta pegada con `+` (un literal que empieza por `/` o `?`, una
 * plantilla de ruta o una constante de ruta) es mala siempre; una plantilla que empieza por
 * otra cosa en minúsculas (`${base}/…`) es una ruta, y ese principio no vale; y el sufijo de
 * búsqueda se acepta por lo que es (`?nombre=${encodeURIComponent(…)}` o URLSearchParams),
 * no por cómo se llama la variable.
 */
const RAIZ = globalThis.process.cwd();
const REPOSITORIOS = 'src/infrastructure/repositories';
const FICHEROS_EXTRA = ['src/components/ui/Avatar.jsx'];

// La constante con la que empieza una ruta: BASE, RUTA_…, getApiBaseUrl()
const CONSTANTE_INICIAL = /^(?:[A-Z][A-Z0-9_]*|getApiBaseUrl\(\))$/;
// El sufijo de búsqueda que construye el propio repositorio («?…» o nada), al final. Se
// acepta por lo que vale, no por el nombre de la variable (#1100):
// - `?nombre=${encodeURIComponent(x)}` si se cumple la condición, o nada;
const SUFIJO_CODIFICADO = /^[\w.$]+(?: [!=]==? null)? \? `\?[a-z_]+=\$\{encodeURIComponent\([\w.$]+\)\}` : ''$/;
// - `?${qs}` o nada, con `qs` sacado de un URLSearchParams;
const CON_QUERY_STRING = /^(\w+) \? `\?\$\{\1\}` : ''$/;
// - `'?' + params` o nada, con `params` un URLSearchParams;
const CON_MAS_PARAMS = /^(\w+)\.toString\(\) \? '\?' \+ \1 : ''$/;
// - lo que devuelve un constructor privado (`this.#buildQuery(…)`) que hace eso mismo.
const LLAMADA_A_CONSTRUCTOR = /^this\.#(\w+)\(.*\)$/s;
const CUERPO_DE_CONSTRUCTOR =
  /^[^]*const params = new URLSearchParams\(\);[^]*const queryString = params\.toString\(\);\s*return queryString \? `\?\$\{queryString\}` : '';\s*$/;
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
    out.push({ desde: i, hasta: j, texto, partes });
    i = j;
  }
  return out;
};

/**
 * Si una plantilla parece una ruta: empieza por `/`, por `?` o por una interpolación seguida
 * de `/` (una constante de ruta, o algo en minúsculas que el análisis rechaza, #1100).
 */
const pareceRuta = ({ texto }) =>
  texto.startsWith('/') || texto.startsWith('?') || (texto.startsWith('\u0000') && texto.slice(1).startsWith('/'));

/** El valor de la última `const`/`let` con ese nombre antes de `desde`, o null. */
const declaracion = (fuente, nombre, desde) => {
  let ultima = null;
  for (const m of fuente.slice(0, desde).matchAll(new RegExp(`(?:const|let)\\s+${nombre}\\s*=\\s*([^;\\n]+);`, 'g'))) {
    ultima = m[1].trim();
  }
  return ultima;
};

const esUrlSearchParams = (fuente, nombre, desde) => /^new URLSearchParams\(/.test(declaracion(fuente, nombre, desde) ?? '');

/** Si el método privado `#nombre` de la fuente arma la búsqueda con URLSearchParams. */
const esConstructorDeBusqueda = (fuente, nombre) => {
  const inicio = fuente.search(new RegExp(`^\\s*#${nombre}\\([^)]*\\)\\s*\\{`, 'm'));
  if (inicio < 0) return false;
  const fin = fuente.indexOf('\n  }', inicio);
  return CUERPO_DE_CONSTRUCTOR.test(fuente.slice(fuente.indexOf('{', inicio) + 1, fin < 0 ? undefined : fin));
};

/** Si la expresión es un sufijo de búsqueda de verdad («?…» bien codificado, o nada). */
const esSufijoDeBusqueda = (expresion, fuente, desde, vueltas = 0) => {
  if (/^[A-Za-z_$][\w$]*$/.test(expresion)) {
    const valor = declaracion(fuente, expresion, desde);
    return valor !== null && vueltas < 3 && esSufijoDeBusqueda(valor, fuente, desde, vueltas + 1);
  }
  const llamada = expresion.match(LLAMADA_A_CONSTRUCTOR);
  if (llamada) return esConstructorDeBusqueda(fuente, llamada[1]);
  if (SUFIJO_CODIFICADO.test(expresion)) return true;
  const conQueryString = expresion.match(CON_QUERY_STRING);
  if (conQueryString) {
    const params = declaracion(fuente, conQueryString[1], desde)?.match(/^(\w+)\.toString\(\)$/);
    return Boolean(params) && esUrlSearchParams(fuente, params[1], desde);
  }
  const conMas = expresion.match(CON_MAS_PARAMS);
  return Boolean(conMas) && esUrlSearchParams(fuente, conMas[1], desde);
};

/** Las rutas pegadas con `+`: un literal que empieza por `/` o `?`, una plantilla de ruta o una constante de ruta. */
const concatenaciones = (fuente) => {
  const lineaDe = (i) => fuente.slice(0, i).split('\n').length;
  // El `'?' + params` de un sufijo de URLSearchParams no es una ruta: lo mira esSufijoDeBusqueda
  const sinSufijos = fuente.replace(/(\w+)\.toString\(\) \? '\?' \+ \1 : ''/g, (m) => ' '.repeat(m.length));
  const malas = [...sinSufijos.matchAll(/(['"])[/?][^'"\n]*\1\s*\+|\+\s*(['"])[/?]/g)].map((m) => [m.index, m[0]]);
  for (const p of plantillas(fuente).filter(pareceRuta)) {
    if (/^\s*\+/.test(fuente.slice(p.hasta + 1)) || /\+\s*$/.test(fuente.slice(0, p.desde))) malas.push([p.desde, '`…` +']);
  }
  const constantes = [...fuente.matchAll(/const ([A-Z][A-Z0-9_]*)\s*=\s*(?:['"]\/|`\/|`\$\{getApiBaseUrl\(\)\})/g)].map((m) => m[1]);
  for (const c of constantes) {
    for (const m of fuente.matchAll(new RegExp(`\\b${c}\\s*\\+|\\+\\s*${c}\\b`, 'g'))) malas.push([m.index, m[0]]);
  }
  return malas.map(([i, texto]) => [lineaDe(i), texto.trim()]);
};

const fuentes = (dir) =>
  readdirSync(resolve(RAIZ, dir)).flatMap((f) => {
    const ruta = join(dir, f);
    if (statSync(resolve(RAIZ, ruta)).isDirectory()) return fuentes(ruta);
    return /\.(js|jsx|ts|tsx)$/.test(f) && !/\.test\./.test(f) ? [ruta] : [];
  });

/** Los valores a pelo de una fuente, como `fichero:línea ${expresión}`. */
const malasEnFuente = (fuente, fichero = 'x.js') => {
  const malas = [];
  {
    for (const plantilla of plantillas(fuente)) {
      if (!pareceRuta(plantilla)) continue;
      const linea = fuente.slice(0, plantilla.desde).split('\n').length;
      plantilla.partes.forEach(({ expresion, antes, alFinal }, n) => {
        if (n === 0 && antes === '' && CONSTANTE_INICIAL.test(expresion)) return;
        const enLaBusqueda = plantilla.texto.startsWith('?') || antes.includes('?');
        const vale = enLaBusqueda
          ? EN_LA_BUSQUEDA.some((r) => r.test(expresion))
          : expresion.startsWith('segmento(') || (alFinal && esSufijoDeBusqueda(expresion, fuente, plantilla.desde));
        if (!vale) malas.push(`${fichero}:${linea} \${${expresion}}`);
      });
    }
  }
  for (const [linea, texto] of concatenaciones(fuente)) malas.push(`${fichero}:${linea} ruta con + (${texto})`);
  return malas;
};

const malasDe = (ficheros) =>
  ficheros.flatMap((fichero) => malasEnFuente(readFileSync(resolve(RAIZ, fichero), 'utf8'), fichero));

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

  // #1100: lo que la primera versión no veía
  it.each([
    ['un literal de ruta con +', "apiRequest('/api/v1/users/' + userId);"],
    ['un + tras una plantilla de ruta', 'apiRequest(`/api/v1/users/${segmento(id)}` + extra);'],
    ['un + delante de una plantilla de ruta', 'apiRequest(base + `/users/${segmento(id)}`);'],
    ['una constante de ruta con +', "const BASE = '/api/v1/x';\napiRequest(BASE + '/' + id);"],
    ['una constante de ruta con + a secas', "const BASE = `${getApiBaseUrl()}/api/v1/x`;\napiRequest(BASE + id);"],
    ['una constante en minúsculas', "const base = '/api/v1/x';\napiRequest(`${base}/${segmento(id)}`);"],
    ['una llamada en minúsculas', 'apiRequest(`${baseDe(x)}/users/${segmento(id)}`);'],
    ['una variable «query» que no es una búsqueda', 'const query = id;\napiRequest(`/api/v1/x${query}`);'],
    ['una variable «queryString» sin «?»', 'const queryString = id;\napiRequest(`/api/v1/x${queryString}`);'],
    ['un sufijo «filtro» con el valor sin codificar', "const filtro = c ? `?c=${c}` : '';\napiRequest(`/api/v1/x${filtro}`);"],
    ['un sufijo «filtro» que no empieza por ?', "const filtro = c ? `/${c}` : '';\napiRequest(`/api/v1/x${filtro}`);"],
    ['un constructor de búsqueda que no es URLSearchParams', `class R {
  #buildQueryString(f) {
    return f.id;
  }
  a(f) { const queryString = this.#buildQueryString(f); return apiRequest(\`/api/v1/x\${queryString}\`); }
}`],
    ['un «?» + algo que no es URLSearchParams', "apiRequest(`/api/v1/x${a ? '?' + a : ''}`);"],
    ['un «?» + un toString() que no es URLSearchParams', "const a = id;\napiRequest(`/api/v1/x${a.toString() ? '?' + a : ''}`);"],
    ['un sufijo en línea sin codificar', "apiRequest(`/api/v1/x${c ? `?c=${c}` : ''}`);"],
    ['un sufijo en línea que no empieza por ?', "apiRequest(`/api/v1/x${c ? `/${encodeURIComponent(c)}` : ''}`);"],
    ['queryString de algo que no es URLSearchParams', "const queryString = id.toString();\napiRequest(`/api/v1/x${queryString ? `?${queryString}` : ''}`);"],
  ])('el analizador caza %s', (_caso, fuente) => {
    expect(malasEnFuente(fuente)).not.toEqual([]);
  });

  it.each([
    ['una constante de ruta', "const BASE = '/api/v1/x';\napiRequest(`${BASE}/${segmento(id)}`);"],
    ['getApiBaseUrl()', 'f(`${getApiBaseUrl()}/api/v1/users/${segmento(id)}`);'],
    ['un sufijo codificado', "const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';\napiRequest(`/api/v1/x${query}`);"],
    ['un sufijo codificado con condición', "const filtro = c != null ? `?c=${encodeURIComponent(c)}` : '';\napiRequest(`/api/v1/x${filtro}`);"],
    ['un sufijo codificado en línea', "f(`/api/v1/x${version ? `?v=${encodeURIComponent(version)}` : ''}`);"],
    ['un constructor de búsqueda con URLSearchParams', `class R {
  #buildQueryString(f) {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => params.append(k, v));
    const queryString = params.toString();
    return queryString ? \`?\${queryString}\` : '';
  }
  a(f) { const queryString = this.#buildQueryString(f); return apiRequest(\`/api/v1/x\${queryString}\`); }
  b(f) { return apiRequest(\`/api/v1/y\${this.#buildQueryString(f)}\`); }
}`],
    ['URLSearchParams con «?» +', "const queryParams = new URLSearchParams(f);\napiRequest(`/api/v1/x${queryParams.toString() ? '?' + queryParams : ''}`);"],
    ['URLSearchParams en queryString', "const queryParams = new URLSearchParams();\nconst queryString = queryParams.toString();\napiRequest(`/api/v1/x${queryString ? `?${queryString}` : ''}`);"],
  ])('el analizador deja pasar %s', (_caso, fuente) => {
    expect(malasEnFuente(fuente)).toEqual([]);
  });

  it('apiRequest solo se llama desde los repositorios (y su propia capa http)', () => {
    const fuera = fuentes('src')
      .filter((f) => !f.startsWith(REPOSITORIOS) && !f.startsWith('src/infrastructure/http'))
      .filter((f) => /\bapiRequest\(/.test(readFileSync(resolve(RAIZ, f), 'utf8')));
    expect(fuera).toEqual([]);
  });
});
