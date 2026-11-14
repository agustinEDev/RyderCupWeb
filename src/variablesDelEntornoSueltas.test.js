import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * El paquete de producción no lleva el objeto entero de variables (auditoría de
 * la fase 6, F-03).
 *
 * Vite cambia cada `import.meta.env.VITE_ALGO` por su valor, pero un
 * `import.meta.env` a secas lo convierte en el objeto con TODAS las variables
 * `VITE_*` de la compilación. Hoy son públicas; una que se añadiera mañana en
 * Render saldría a todos los visitantes sin que nadie lo decidiera.
 *
 *   caso                                        | qué pasa
 *   --------------------------------------------|------------------------------
 *   V1 el código de src                         | solo lee variables sueltas
 *   V2 el muestreo de Sentry                    | sigue leyendo sus tres variables
 */

const SRC = join(globalThis.process.cwd(), 'src');

const ficheros = (dir) =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.(js|jsx|ts|tsx)$/.test(nombre) &&
      !/\.test\.|\.spec\.|\.d\.ts$/.test(nombre)
      ? [ruta]
      : [];
  });

// `import.meta.env` que no va seguido de `.NOMBRE`: el objeto entero
const ENTERO = /import\.meta\.env(?!\s*\.\s*[A-Za-z_$])/g;

describe('variables del entorno, sueltas', () => {
  it('V1: ningún fichero de src usa import.meta.env entero', () => {
    const usos = ficheros(SRC).flatMap((ruta) => {
      const texto = readFileSync(ruta, 'utf8');
      return [...texto.matchAll(ENTERO)].map(
        (m) =>
          `${relative(SRC, ruta)}:${texto.slice(0, m.index).split('\n').length}`,
      );
    });

    expect(usos).toEqual([]);
  });

  it('V2: el muestreo de Sentry lee sus tres variables', () => {
    // Sin espacios ni saltos: Prettier parte la línea tras `import.meta.env`
    const texto = readFileSync(
      join(SRC, 'utils/sentrySampleRates.js'),
      'utf8',
    ).replace(/\s+/g, '');

    for (const nombre of [
      'VITE_SENTRY_TRACES_SAMPLE_RATE',
      'VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE',
      'VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE',
    ]) {
      expect(texto).toContain(`import.meta.env.${nombre}`);
    }
  });

  it('el escáner reconoce el objeto entero y deja pasar una variable suelta', () => {
    const cuenta = (texto) => [...texto.matchAll(ENTERO)].length;

    expect(cuenta('f(import.meta.env)')).toBe(1);
    expect(cuenta('const { A } = import.meta.env;')).toBe(1);
    expect(cuenta('import.meta.env.VITE_A')).toBe(0);
    expect(cuenta('import.meta.env\n  .VITE_A')).toBe(0);
  });
});
