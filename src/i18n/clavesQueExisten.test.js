import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

/**
 * Cada clave de traducción escrita en el código existe (4 nov 2026). Con un
 * texto de respaldo, `t('searchBox.searching', 'Searching...')`, una clave que
 * falta no se nota en los tests ni en la pantalla en inglés: el buscador de
 * campos decía «Searching...» en español desde hacía meses, y el botón de
 * cerrar de los campos pendientes, «Close».
 *
 * Qué se mira, sin ejecutar el código:
 * - las claves literales de `t(...)` y sus alias (`tComun`, `tSchedule`…),
 *   y las de `i18nKey: '…'` / `i18nKey="…"`;
 * - dónde se buscan: con prefijo (`common:cancel`) o `{ ns: 'x' }`, en ese
 *   espacio; con una `t` sacada de `useTranslation` en el mismo fichero, en
 *   el primero de su lista (o en `common` sin argumento), que es donde busca
 *   i18next; si no se sabe de dónde viene (la `t` llega por props, o un
 *   `i18nKey` suelto), en alguno.
 * Solo se miran los textos en español: que el inglés tenga los mismos lo
 * exige `paridadDeIdiomas.test.js`. Las claves armadas con variables
 * (`formats.${x}`) no entran.
 */

const SRC = resolve(process.cwd(), 'src');
const LOCALES = resolve(SRC, 'i18n/locales/es');

const espacios = Object.fromEntries(
  readdirSync(LOCALES)
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f.replace('.json', ''), JSON.parse(readFileSync(resolve(LOCALES, f), 'utf8'))])
);
const TODOS = Object.keys(espacios);
// `defaultNS` de `src/i18n/config.js`
const POR_DEFECTO = 'common';

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

const ficheros = (dir) =>
  readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.jsx?$/.test(nombre) && !/\.test\./.test(nombre) ? [ruta] : [];
  });

// Sin comentarios: una llamada comentada no es una clave en uso
const sinComentarios = (codigo) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

// `const { t } = useTranslation('ns')`, `{ t: tComun }`, `{ i18n, t }`, listas de espacios
const DECLARACION = /const\s*\{([^}]*)\}\s*=\s*useTranslation\(\s*(\[[^\]]*\]|['"][^'"]*['"])?/g;
// `t('…')`, `tComun("…")`, `t(\`…\`)` sin variables, con `{ ns: 'x' }` opcional;
// no `toast('…')` ni `obj.trim('…')`
const LLAMADA =
  /(?<![\w$.])(t(?:[A-Z]\w*)?)\(\s*(['"`])([\w.:-]+)\2(?:\s*,\s*\{[^}]*?\bns:\s*['"](\w+)['"])?/g;
const I18N_KEY = /\bi18nKey\s*[:=]\s*\{?\s*(['"`])([\w.:-]+)\1/g;

const espaciosDeCadaT = (codigo) => {
  const mapa = new Map();
  for (const [, destructurado, argumento] of codigo.matchAll(DECLARACION)) {
    const alias = destructurado.match(/(?:^|,)\s*t\s*(?::\s*(\w+))?\s*(?:,|$)/);
    if (!alias) continue;
    const variable = alias[1] || 't';
    // i18next busca solo en el primero de la lista, o en `common` sin
    // argumento (`defaultNS`; no hay `fallbackNS`) (CodeRabbit)
    const primero = argumento?.match(/['"]([^'"]+)['"]/)?.[1];
    const suyos = [primero ?? POR_DEFECTO];
    mapa.set(variable, [...(mapa.get(variable) ?? []), ...suyos]);
  }
  return mapa;
};

const dondeBuscar = (clave, opcionNs, candidatos) => {
  const dosPuntos = clave.indexOf(':');
  if (dosPuntos >= 0) return { espacios: [clave.slice(0, dosPuntos)], clave: clave.slice(dosPuntos + 1) };
  if (opcionNs) return { espacios: [opcionNs], clave };
  return { espacios: candidatos ?? TODOS, clave };
};

const clavesQueFaltan = () =>
  ficheros(SRC).flatMap((fichero) => {
    const codigo = sinComentarios(readFileSync(fichero, 'utf8'));
    const deCadaT = espaciosDeCadaT(codigo);
    const usos = [
      ...[...codigo.matchAll(LLAMADA)].map(([, variable, , clave, ns]) => dondeBuscar(clave, ns, deCadaT.get(variable))),
      ...[...codigo.matchAll(I18N_KEY)].map(([, , clave]) => dondeBuscar(clave, null, null)),
    ];
    return usos
      .filter(({ espacios: suyos, clave }) => !suyos.some((e) => existe(e, clave)))
      .map(({ espacios: suyos, clave }) => `${relative(SRC, fichero)}: '${clave}' en ${suyos.length === TODOS.length ? 'ninguno' : suyos.join(', ')}`);
  });

describe('Las claves de traducción existen', () => {
  it('cada clave literal está en el JSON donde se busca', () => {
    expect([...new Set(clavesQueFaltan())]).toEqual([]);
  });
});
