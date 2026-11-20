import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

/**
 * La geometría del mapa del hoyo no va en el arranque.
 *
 * El arranque es todo lo que main.jsx importa sin `import()`, y la composición
 * monta al cargar `GetCourseLocationUseCase`, que solo necesita saber si una
 * posición vale. Importándolo de `geometriaDelHoyo`, el trozo entero de la
 * geometría del mapa (~1 KB gzip) se cargaba al abrir la app, sin mapa a la
 * vista (20 nov 2026, con el arranque en su tope de 270 KB). La comprobación
 * vive en `posicionValida`; la geometría llega con el mapa.
 */
const SRC = resolve(globalThis.process.cwd(), 'src');
const EXTENSIONES = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js'];

const resuelve = (desde, ruta) => {
  if (!ruta.startsWith('.')) return null;
  const base = resolve(dirname(desde), ruta);
  const fichero = EXTENSIONES.map((e) => base + e).find(
    (f) => existsSync(f) && !f.endsWith('/') && /\.[jt]sx?$/.test(f),
  );
  return fichero ?? null;
};

// Los imports estáticos (`import … from '…'`, `import '…'`, `export … from '…'`),
// sin los `import()` dinámicos, que no van en el arranque
const importsEstaticos = (fichero) => {
  const codigo = readFileSync(fichero, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const rutas = [];
  for (const m of codigo.matchAll(
    /^\s*(?:import|export)\s[^;]*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm,
  ))
    rutas.push(m[1] ?? m[2]);
  return rutas;
};

const delArranque = () => {
  const vistos = new Set();
  const pendientes = [resolve(SRC, 'main.jsx')];
  while (pendientes.length) {
    const fichero = pendientes.pop();
    if (vistos.has(fichero)) continue;
    vistos.add(fichero);
    for (const ruta of importsEstaticos(fichero)) {
      const siguiente = resuelve(fichero, ruta);
      if (siguiente) pendientes.push(siguiente);
    }
  }
  return [...vistos].map((f) => relative(SRC, f));
};

describe('El arranque sin la geometría del mapa', () => {
  it('main.jsx no llega a geometriaDelHoyo sin un import() por medio', () => {
    const arranque = delArranque();

    // El recorrido funciona: la composición y el caso de uso sí están
    expect(arranque).toContain('composition/index.js');
    expect(arranque).toContain(
      'application/use_cases/golf_course/GetCourseLocationUseCase.js',
    );
    expect(arranque).not.toContain('domain/services/geometriaDelHoyo.js');
  });
});
