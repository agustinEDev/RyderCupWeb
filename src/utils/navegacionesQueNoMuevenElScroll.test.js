import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Lo que hoy no mueve el scroll, sigue sin moverlo (FE #647, fase 3; Agustín,
 * 2 nov 2026: «que el funcionamiento sea igual que el de ahora»).
 *
 * `<ScrollRestoration />` sube arriba en cada navegación nueva, también si solo
 * cambia el query (los filtros del admin) o el `#` (abrir el mapa del hoyo).
 * Su forma de decir «no me muevas» es `preventScrollReset`, y hay que ponerlo en
 * cada una: este test las busca todas.
 *
 *   #   | caso                                                  | esperado
 *   ----|-------------------------------------------------------|---------------------------
 *   P1  | cada `navigate({ search/hash })` sin cambiar de ruta   | lleva `preventScrollReset`
 *   P2  | cada setter de `useSearchParams`                       | lleva `preventScrollReset`
 *   P4  | una llamada partida en varias líneas                   | también se mira
 *   P3  | las que existen hoy                                    | las encuentra (si no, el
 *       |                                                       | test no vigila nada)
 */
const SRC = resolve(process.cwd(), 'src');

const ficheros = () => {
  const salida = [];
  const recorre = (dir) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, entrada.name);
      if (entrada.isDirectory()) recorre(ruta);
      else if (/\.jsx?$/.test(entrada.name) && !/\.test\./.test(entrada.name)) salida.push(ruta);
    }
  };
  recorre(SRC);
  return salida;
};

// Desde la llamada hasta su cierre, contando paréntesis
const llamadaDesde = (texto, inicio) => {
  let profundidad = 0;
  for (let i = texto.indexOf('(', inicio); i < texto.length; i += 1) {
    if (texto[i] === '(') profundidad += 1;
    if (texto[i] === ')' && (profundidad -= 1) === 0) return texto.slice(inicio, i + 1);
  }
  return texto.slice(inicio);
};

const navegacionesSinMoverse = () => {
  const halladas = [];
  for (const ruta of ficheros()) {
    const texto = readFileSync(ruta, 'utf8');
    const donde = relative(SRC, ruta);
    // Con `\s*`: partida en varias líneas también cuenta (se escapaba la del mapa)
    for (const m of texto.matchAll(/\bnavigate\(\s*\{/g)) {
      halladas.push({ donde, llamada: llamadaDesde(texto, m.index) });
    }
    for (const [, setter] of texto.matchAll(/const \[\w*,\s*(\w+)\]\s*=\s*useSearchParams\(/g)) {
      for (const m of texto.matchAll(new RegExp(`\\b${setter}\\(`, 'g'))) {
        halladas.push({ donde, llamada: llamadaDesde(texto, m.index) });
      }
    }
  }
  return halladas;
};

describe('navegaciones que no mueven el scroll', () => {
  it('P1 y P2: todas llevan preventScrollReset', () => {
    const sinMarca = navegacionesSinMoverse()
      .filter(({ llamada }) => !/preventScrollReset:\s*true/.test(llamada))
      .map(({ donde, llamada }) => `${donde}: ${llamada.replace(/\s+/g, ' ')}`);

    expect(sinMarca).toEqual([]);
  });

  it('P4: encuentra también las llamadas partidas en varias líneas', () => {
    const delMapa = navegacionesSinMoverse().filter((n) => n.donde === 'hooks/useMapaDelHoyo.js');

    expect(delMapa).toHaveLength(2);
  });

  it('P3: encuentra las de hoy (el mapa del hoyo y los filtros del admin)', () => {
    const donde = new Set(navegacionesSinMoverse().map((n) => n.donde));

    expect([...donde].sort()).toEqual([
      'components/admin/hoyos/TodosLosCampos.jsx',
      'hooks/useMapaDelHoyo.js',
      'pages/admin/AdminPanel.jsx',
    ]);
  });
});
