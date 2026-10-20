import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Cada texto existe en los dos idiomas con la misma forma (auditoría legal del
 * 20 oct 2026, F8). i18next devuelve la CLAVE cuando no encuentra un texto, así
 * que un hueco en `en` no rompe nada: pinta «legalNotice.section3.title» en
 * pantalla, y en un texto legal eso equivale a no decir lo que hay que decir.
 *
 * Se mira cada espacio de nombres, no solo `legal.json`: así cubre también las
 * claves nuevas de los demás.
 *
 * La única asimetría permitida es el contexto gramatical femenino (`_female`):
 * el español concuerda en género («retirada») y el inglés casi nunca lo
 * necesita, así que puede estar en uno solo de los dos.
 */

const LOCALES = resolve(process.cwd(), 'src/i18n/locales');

const claves = (objeto, prefijo = '') =>
  Object.entries(objeto).flatMap(([clave, valor]) =>
    valor && typeof valor === 'object' ? claves(valor, `${prefijo}${clave}.`) : [`${prefijo}${clave}`]
  );

const leer = (idioma, fichero) => JSON.parse(readFileSync(resolve(LOCALES, idioma, fichero), 'utf8'));

const SOLO_EN_ESPANOL = /_female$/;

const ficheros = readdirSync(resolve(LOCALES, 'es')).filter((f) => f.endsWith('.json'));

describe('Los dos idiomas tienen los mismos textos', () => {
  it('los dos idiomas tienen los mismos ficheros', () => {
    const enIngles = readdirSync(resolve(LOCALES, 'en')).filter((f) => f.endsWith('.json'));

    expect(enIngles.sort()).toEqual([...ficheros].sort());
  });

  it.each(ficheros)('%s: misma estructura en es y en', (fichero) => {
    const es = claves(leer('es', fichero)).filter((c) => !SOLO_EN_ESPANOL.test(c));
    const en = claves(leer('en', fichero)).filter((c) => !SOLO_EN_ESPANOL.test(c));

    expect(en.sort()).toEqual(es.sort());
  });

  it.each(ficheros)('%s: ningún texto vacío en un idioma y lleno en el otro', (fichero) => {
    // Vacío en los dos es deliberado (el periodo del plan sin precio); en uno
    // solo, es una traducción que se quedó por el camino
    const valor = (objeto, ruta) => ruta.split('.').reduce((o, k) => o?.[k], objeto);
    const es = leer('es', fichero);
    const en = leer('en', fichero);

    const cojos = claves(en)
      .filter((c) => !SOLO_EN_ESPANOL.test(c))
      .filter((c) => (String(valor(es, c) ?? '').trim() === '') !== (String(valor(en, c) ?? '').trim() === ''));

    expect(cojos).toEqual([]);
  });

  it('el Aviso Legal existe en los dos idiomas', () => {
    expect(leer('es', 'legal.json').legalNotice).toBeTruthy();
    expect(leer('en', 'legal.json').legalNotice).toBeTruthy();
  });
});

describe('textos sueltos de la revisión legal', () => {
  it('B-2: la fuente del hándicap nombra a la RFEG por sus siglas en los dos idiomas', () => {
    expect(leer('es', 'profile.json').handicapSource.rfeg).toBe('Fuente: Real Federación Española de Golf (RFEG)');
    expect(leer('en', 'profile.json').handicapSource.rfeg).toContain('(RFEG)');
  });
});
