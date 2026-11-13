import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Toda ida al login con la página de la que se venía lleva la última cuenta de la pestaña
 * (FE #1064, R1): se construye solo con `estadoParaElLogin`. El Dashboard tenía su propia
 * redirección con `state={{ from: location }}` y se quedó fuera (code-review); esto fija
 * que no vuelva a haber otra. Es una aserción sobre el fuente, como `salidaUnica.test.js`.
 */
const SRC = resolve(process.cwd(), 'src');

const ficheros = (dir) =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.(jsx?|tsx?)$/.test(nombre) && !/\.test\./.test(nombre)
      ? [ruta]
      : [];
  });

// `<Navigate to="/login" state={{ from: … }}` o `navigate('/login', { state: { from: … } })`
const A_MANO = [
  /to="\/login"\s+state=\{\{\s*from/,
  /navigate\(\s*['"]\/login['"]\s*,\s*\{\s*state:\s*\{\s*from/,
];

describe('ir al login con la página de la que se venía', () => {
  it('nadie construye el estado a mano: siempre `estadoParaElLogin`', () => {
    const a_mano = ficheros(SRC).filter((ruta) => {
      const fuente = readFileSync(ruta, 'utf8');
      return A_MANO.some((patron) => patron.test(fuente));
    });

    expect(a_mano.map((r) => r.slice(SRC.length + 1))).toEqual([]);
  });
});
