import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Titulos de pagina frente a la cabecera contextual (FE #329).
 *
 * Desde FE #310 la cabecera pinta el titulo de la pantalla en movil, y lo hace
 * en un `<h1>`. Una pagina que ademas pinte el suyo repite el dato en la franja
 * mas cara de la pantalla y, si tambien usa `<h1>`, deja dos en el arbol de
 * accesibilidad: para un lector de pantalla eso es una jerarquia rota, no una
 * simple repeticion.
 *
 * `hidden` (display: none) si retira el elemento del arbol de accesibilidad,
 * al contrario que `sr-only`, que solo lo oculta a la vista. Por eso la regla
 * es `hidden md:block` y no una clase de solo-lectores.
 *
 * Estas son aserciones sobre el fichero porque jsdom no aplica media queries:
 * un render no distingue `hidden md:block` de visible.
 */

const read = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

/** Rutas inmersivas o publicas: la cabecera contextual no aparece en ellas. */
const SIN_CABECERA_CONTEXTUAL = [
  'player/ScoringPage.jsx',
  'quick_match/QuickMatchScoringPage.jsx',
  'public/LeaderboardPage.jsx',
];

/** Sin ruta en App.jsx: inalcanzables, pendientes de FE #244. */
const SIN_RUTA = ['admin/GolfCourses.jsx', 'admin/PendingGolfCourses.jsx'];

function listarPaginas(dir, prefijo = '') {
  const salida = [];
  for (const entrada of readdirSync(resolve(process.cwd(), dir))) {
    const ruta = join(dir, entrada);
    if (statSync(resolve(process.cwd(), ruta)).isDirectory()) {
      salida.push(...listarPaginas(ruta, `${prefijo}${entrada}/`));
    } else if (entrada.endsWith('.jsx') && !entrada.includes('.test.')) {
      salida.push({ ruta, nombre: `${prefijo}${entrada}` });
    }
  }
  return salida;
}

describe('page titles vs the contextual header', () => {
  const paginas = listarPaginas('src/pages')
    .filter(({ ruta }) => read(ruta).includes('HeaderAuth'))
    .filter(({ nombre }) => !SIN_CABECERA_CONTEXTUAL.includes(nombre) && !SIN_RUTA.includes(nombre));

  it('finds the authenticated pages to check', () => {
    expect(paginas.length).toBeGreaterThan(5);
  });

  it.each(paginas)('$nombre does not render a second h1 on mobile', ({ ruta }) => {
    const fuente = read(ruta);
    const encabezados = fuente.match(/<h1[^>]*>/g) ?? [];

    for (const encabezado of encabezados) {
      // Si la pagina pinta un h1, debe quedarse fuera del movil: alli el titulo
      // ya lo pone la cabecera
      expect(encabezado).toContain('hidden md:block');
    }
  });

  it('keeps the header as the only h1 on mobile', () => {
    // La cabecera si pinta el suyo sin condicion: es la fuente del titulo
    const header = read('src/components/layout/HeaderAuth.jsx');

    expect(header).toMatch(/<h1[^>]*>/);
    expect(header).not.toContain('<h1 className="hidden');
  });
});
