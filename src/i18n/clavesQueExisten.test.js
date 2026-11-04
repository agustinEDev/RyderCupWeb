import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

/**
 * Cada `t('una.clave')` existe en algún JSON (4 nov 2026). Con un texto de
 * respaldo, `t('searchBox.searching', 'Searching...')`, una clave que falta no
 * se nota en los tests ni en la pantalla en inglés: el buscador de campos
 * decía «Searching...» en español desde hacía meses, y el botón de cerrar de
 * los campos pendientes, «Close».
 *
 * Se recogen las claves literales de cualquier `t(...)` o alias (`tComun`,
 * `tSchedule`…), venga la `t` de `useTranslation` o de las props. Saber en qué
 * espacio busca cada `t` no se puede sin ejecutar el código, así que la regla
 * es: con prefijo (`common:cancel`), en ese espacio; sin él, en alguno. Atrapa
 * la que no está en ninguno, que es el fallo que se veía. Las armadas con
 * plantilla (`formats.${x}`) no entran.
 */

const SRC = resolve(process.cwd(), 'src');
const LOCALES = resolve(SRC, 'i18n/locales/es');

const espacios = Object.fromEntries(
  readdirSync(LOCALES)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f.replace('.json', ''), JSON.parse(readFileSync(resolve(LOCALES, f), 'utf8'))])
);

// Un texto, no un grupo: plurales y contextos de i18next van como `clave_one`…
const existe = (espacio, clave) => {
  const partes = clave.split('.');
  const ultima = partes.pop();
  let nodo = espacios[espacio];
  for (const parte of partes) {
    if (!nodo || typeof nodo !== 'object' || !(parte in nodo)) return false;
    nodo = nodo[parte];
  }
  if (!nodo || typeof nodo !== 'object') return false;
  if (typeof nodo[ultima] === 'string') return true;
  return Object.keys(nodo).some((k) => k.startsWith(`${ultima}_`) && typeof nodo[k] === 'string');
};

const existeEnAlguno = (clave) => {
  const [espacio, resto] = clave.includes(':') ? clave.split(':') : [null, clave];
  return espacio ? existe(espacio, resto) : Object.keys(espacios).some((e) => existe(e, resto));
};

const ficheros = (dir) =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.jsx?$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : [];
  });

// `t('…')`, `tComun('…')`, `props.t("…")`; no `toast('…')` ni `obj.trim('…')`
const LLAMADA = /(?<![\w$])t(?:[A-Z]\w*)?\(\s*(['"])([\w.:-]+)\1/g;

const clavesQueFaltan = () =>
  ficheros(SRC).flatMap((fichero) =>
    [...readFileSync(fichero, 'utf8').matchAll(LLAMADA)]
      .map((m) => m[2])
      .filter((clave) => !existeEnAlguno(clave))
      .map((clave) => `${relative(SRC, fichero)}: '${clave}'`)
  );

describe('Las claves de traducción existen', () => {
  it("cada t('clave') literal está en algún JSON (o en el de su prefijo)", () => {
    expect([...new Set(clavesQueFaltan())]).toEqual([]);
  });
});
