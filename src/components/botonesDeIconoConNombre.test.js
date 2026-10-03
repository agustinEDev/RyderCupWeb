import { describe, it, expect } from 'vitest';
import comunEs from '../i18n/locales/es/common.json';
import comunEn from '../i18n/locales/en/common.json';
import campoEs from '../i18n/locales/es/golfCourses.json';
import campoEn from '../i18n/locales/en/golfCourses.json';

/**
 * Ningún botón que solo lleve un icono se queda sin nombre.
 *
 * En la prueba en bloque del 4 oct 2026 salieron quince: la X de quitar un país
 * adyacente, las papeleras de los campos, la X de cerrar de nueve modales y la de
 * quitar al invitado elegido. Un lector de pantalla los anunciaba como «botón»,
 * sin más. Este test lee el código de todas las pantallas para que no vuelva a
 * colarse uno: un botón cuyo único contenido es un icono necesita `aria-label`.
 */
const fuentes = import.meta.glob(['/src/**/*.jsx', '!/src/**/*.test.jsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const ICONO = /<[A-Z]\w*\b[^>]*\/>/g;
const COMENTARIO = /\{\/\*[\s\S]*?\*\/\}/g;

// Cada `<button …>…</button>`. La etiqueta acaba en el primer `>` que no está
// dentro de llaves: el de `() =>` o el de `a > b` es parte de un atributo
const botones = (codigo) => {
  const encontrados = [];
  let desde = codigo.indexOf('<button');
  while (desde !== -1) {
    let profundidad = 0;
    let fin = desde + '<button'.length;
    for (; fin < codigo.length; fin++) {
      const c = codigo[fin];
      if (c === '{') profundidad++;
      else if (c === '}') profundidad--;
      else if (c === '>' && profundidad === 0) break;
    }
    const cierre = codigo.indexOf('</button>', fin);
    if (cierre === -1) break;
    encontrados.push([
      codigo.slice(desde, cierre),
      codigo.slice(desde + '<button'.length, fin),
      codigo.slice(fin + 1, cierre),
    ]);
    desde = codigo.indexOf('<button', cierre);
  }
  return encontrados;
};

const botonesSinNombre = (codigo) => {
  const encontrados = [];
  for (const [entero, atributos, contenido] of botones(codigo)) {
    if (/aria-label|aria-labelledby|title=/.test(atributos)) continue;
    const tieneIcono = ICONO.test(contenido);
    ICONO.lastIndex = 0;
    const resto = contenido.replace(ICONO, '').replace(COMENTARIO, '').trim();
    if (tieneIcono && resto === '') encontrados.push(entero.split('\n')[0].trim());
  }
  return encontrados;
};

describe('Botones de solo icono', () => {
  it('el detector encuentra uno sin nombre y deja pasar los nombrados', () => {
    expect(botonesSinNombre('<button onClick={f}>\n  <X className="w-4" />\n</button>')).toHaveLength(1);
    expect(botonesSinNombre('<button aria-label={t("close")}><X /></button>')).toEqual([]);
    expect(botonesSinNombre('<button><X /> {t("close")}</button>')).toEqual([]);
  });

  // La revisión de la PR: el detector cortaba en el `>` de `() =>` y no veía
  // ni el `aria-label` de después ni el botón entero
  it('tampoco se le escapa un botón con una flecha o un `>` en sus atributos', () => {
    expect(
      botonesSinNombre('<button\n  onClick={() => quitar(i)}\n  className="p-2"\n>\n  <Trash2 />\n</button>')
    ).toHaveLength(1);
    expect(botonesSinNombre('<button disabled={a > b}><X /></button>')).toHaveLength(1);
    expect(
      botonesSinNombre('<button onClick={() => quitar(i)} aria-label={t("quitar")}><Trash2 /></button>')
    ).toEqual([]);
  });

  // Los nombres de `common` se leen de verdad: con `t` simulado, una clave mal
  // colocada en el JSON pasaba los tests y en la app se leía «removeSelected»
  it.each([
    ['es', comunEs, campoEs],
    ['en', comunEn, campoEn],
  ])('las claves que usan existen en %s', (_, comun, campo) => {
    expect(typeof comun.close).toBe('string');
    expect(comun.removeSelected).toMatch(/\{\{name\}\}/);
    expect(campo.form.removeTee).toMatch(/\{\{number\}\}/);
  });

  it('en toda la app, todos tienen nombre', () => {
    const sinNombre = Object.entries(fuentes)
      .map(([fichero, codigo]) => [fichero, botonesSinNombre(codigo).length])
      .filter(([, cuantos]) => cuantos > 0)
      .map(([fichero, cuantos]) => `${fichero} (${cuantos})`);

    expect(Object.keys(fuentes).length).toBeGreaterThan(100);
    expect(sinNombre).toEqual([]);
  });
});
