import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Inter y Poppins se sirven desde la propia aplicación (revisión de la
 * auditoría legal, M4). Cargarlas de Google Fonts mandaba la IP de cada
 * visitante a Google sin base legal ni aviso; además, la CSP tenía que abrirle
 * la puerta a dos dominios ajenos.
 */
const leer = (ruta) => readFileSync(resolve(process.cwd(), ruta), 'utf8');

const GOOGLE_FONTS = /fonts\.googleapis\.com|fonts\.gstatic\.com/;

describe('fuentes servidas desde la propia aplicación', () => {
  it('la hoja de estilos no las pide a Google', () => {
    expect(leer('src/index.css')).not.toMatch(GOOGLE_FONTS);
  });

  // Desde JS y no con `@import` en `index.css`: Tailwind incrusta esa hoja sin
  // reescribir sus `url(./files/...)`, Vite no emitía ningún .woff2 y la página
  // pedía las fuentes a una ruta que no existe
  it('main.jsx importa las hojas locales de Inter y Poppins, antes que index.css', () => {
    const main = leer('src/main.jsx');

    expect(main).toContain("import '@fontsource-variable/inter';");
    for (const peso of [400, 500, 600, 700, 800]) {
      expect(main).toContain(`import '@fontsource/poppins/${peso}.css';`);
    }
    expect(main.indexOf('@fontsource-variable/inter')).toBeLessThan(main.indexOf("import './index.css'"));
    expect(leer('src/index.css')).not.toMatch(/@import ['"]@fontsource/);
  });

  it('los ficheros que piden esas hojas existen', () => {
    const hojas = [
      'node_modules/@fontsource-variable/inter/index.css',
      ...[400, 500, 600, 700, 800].map((p) => `node_modules/@fontsource/poppins/${p}.css`),
    ];
    for (const hoja of hojas) {
      const urls = [...leer(hoja).matchAll(/url\((\.\/files\/[^)]+)\)/g)].map((m) => m[1]);
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) {
        expect(() => leer(resolve(hoja, '..', url))).not.toThrow();
      }
    }
  });

  it('la familia de Inter se llama como la publica el paquete variable', () => {
    expect(leer('src/index.css')).toContain("'Inter Variable'");
  });

  it.each([
    ['vite.config.js'],
    ['index.html'],
    ['nginx-security-headers.conf'],
    ['nginx.conf'],
  ])('%s no abre la CSP a Google Fonts', (fichero) => {
    expect(leer(fichero)).not.toMatch(GOOGLE_FONTS);
  });
});

describe('precache de las fuentes', () => {
  // El service worker precachea los .woff2 al instalarse. Con todos los
  // alfabetos eran 22 ficheros y unos 470 KB (cirílico, griego, vietnamita,
  // devanagari, latín extendido) para una aplicación en español e inglés. Se
  // precachean solo los de latín (unos 88 KB);
  // el resto sigue disponible y el navegador lo pide si una página lo necesita
  it('vite.config.js deja fuera del precache las fuentes que no son de latín', () => {
    const config = leer('vite.config.js');

    expect(config).toContain("globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese,devanagari,latin-ext}-*.woff2']");
  });
});
