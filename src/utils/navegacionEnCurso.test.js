import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Solo `routerDeLaAplicacion.js` apunta el router (y los tests). Si otro módulo
 * lo cambiara, la vuelta tras aceptar los Términos leería la navegación de otro
 * router. Una regla de ESLint chocaría con las de `no-restricted-imports` que ya
 * tienen las carpetas de la interfaz (la última gana), así que se vigila aquí.
 */
const RAIZ = join(globalThis.process.cwd(), 'src');

const ficheros = (carpeta) =>
  readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) return ficheros(ruta);
    return /\.(js|jsx|ts|tsx)$/.test(entrada.name) && !/\.test\.(js|jsx|ts|tsx)$/.test(entrada.name) ? [ruta] : [];
  });

describe('navegacionEnCurso', () => {
  it('solo routerDeLaAplicacion.js apunta el router de la aplicación', () => {
    const quienes = ficheros(RAIZ)
      .filter((ruta) => /apuntaElRouterDeLaAplicacion\s*\(/.test(readFileSync(ruta, 'utf8')))
      .map((ruta) => relative(RAIZ, ruta))
      .filter((ruta) => ruta !== 'utils/navegacionEnCurso.js');

    expect(quienes).toEqual(['utils/routerDeLaAplicacion.js']);
  });
});
