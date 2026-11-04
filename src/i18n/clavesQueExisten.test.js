import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

/**
 * Cada `t('una.clave')` existe en su JSON (4 nov 2026). Con un texto de
 * respaldo, `t('searchBox.searching', 'Searching...')`, una clave que falta no
 * se nota en los tests ni en la pantalla en inglés: el buscador de campos
 * decía «Searching...» en español desde hacía meses, y el botón de cerrar de
 * los campos pendientes, «Close».
 *
 * Se mira lo que se puede leer sin ejecutar: cada `const { t } =
 * useTranslation('ns')` (o `{ t: otro }`, o una lista de espacios) y sus
 * llamadas con una clave literal. Las claves armadas con plantilla
 * (`formats.${x}`) o con `ns:` no entran.
 */

const SRC = resolve(process.cwd(), 'src');
const LOCALES = resolve(SRC, 'i18n/locales/es');

const espacios = Object.fromEntries(
  readdirSync(LOCALES)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f.replace('.json', ''), JSON.parse(readFileSync(resolve(LOCALES, f), 'utf8'))])
);

const existe = (espacio, clave) => {
  let nodo = espacios[espacio];
  for (const parte of clave.split('.')) {
    if (!nodo || typeof nodo !== 'object') return false;
    if (parte in nodo) {
      nodo = nodo[parte];
      continue;
    }
    // Plurales y contextos de i18next: `clave_one`, `clave_female`…
    return Object.keys(nodo).some((k) => k.startsWith(`${parte}_`));
  }
  return true;
};

const ficheros = (dir) =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.jsx?$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : [];
  });

const DECLARACION = /const\s*\{\s*t(?:\s*:\s*(\w+))?[^}]*\}\s*=\s*useTranslation\(\s*(\[[^\]]*\]|'[^']*')/g;

const clavesQueFaltan = () =>
  ficheros(SRC).flatMap((fichero) => {
    const codigo = readFileSync(fichero, 'utf8');
    return [...codigo.matchAll(DECLARACION)].flatMap(([, alias, argumento]) => {
      const variable = alias || 't';
      const susEspacios = [...argumento.matchAll(/'([^']+)'/g)].map((m) => m[1]);
      const llamada = new RegExp(`(?<![\\w.])${variable}\\(\\s*'([\\w.]+)'`, 'g');
      return [...codigo.matchAll(llamada)]
        .map((m) => m[1])
        .filter((clave) => !susEspacios.some((espacio) => existe(espacio, clave)))
        .map((clave) => `${relative(SRC, fichero)}: ${variable}('${clave}') en ${susEspacios.join(', ')}`);
    });
  });

describe('Las claves de traducción existen', () => {
  it('cada t(\'clave\') literal está en su JSON', () => {
    expect([...new Set(clavesQueFaltan())]).toEqual([]);
  });
});
