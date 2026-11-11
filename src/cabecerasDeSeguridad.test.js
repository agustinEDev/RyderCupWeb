import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Las copias de las cabeceras de seguridad (Vite en preview y en desarrollo, y el nginx
 * del Kind) no se desvían de las de producción (FE-04/FE-05, fase 4 del plan a 9).
 *
 * Producción las sirve Render desde su dashboard; la fuente es
 * `.github/scripts/cabeceras_de_produccion.json`, que un workflow compara cada día con
 * producción. Aquí se exige que las copias lleven lo mismo, con dos salvedades:
 * - lo propio de local: la API en http://localhost:8000 y, solo en desarrollo, lo que
 *   necesita Vite (HMR por ws, scripts en línea y eval);
 * - lo que solo tiene sentido en producción: forzar HTTPS y mandar los avisos a Sentry.
 */
const RAIZ = globalThis.process.cwd();
const leer = (ruta) => readFileSync(resolve(RAIZ, ruta), 'utf8');
const PRODUCCION = JSON.parse(leer('.github/scripts/cabeceras_de_produccion.json'));
const RAIZ_DE_PRO = PRODUCCION.rutas['/'];

const SOLO_EN_PRODUCCION = new Set(['upgrade-insecure-requests', 'report-uri', 'report-to']);
const EXTRA_LOCAL = new Set(['http://localhost:8000']);
const EXTRA_DESARROLLO = new Set([...EXTRA_LOCAL, 'ws://localhost:*', "'unsafe-inline'", "'unsafe-eval'"]);

/** Una CSP como mapa directiva → conjunto de fuentes. */
const directivas = (csp) =>
  new Map(
    csp
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .filter((partes) => partes[0])
      .map(([nombre, ...fuentes]) => [nombre, new Set(fuentes)]),
  );

const comparaCsp = (copia, extra) => {
  const pro = directivas(RAIZ_DE_PRO['content-security-policy']);
  const loc = directivas(copia);
  const diferencias = [];
  for (const [nombre, fuentes] of pro) {
    if (SOLO_EN_PRODUCCION.has(nombre)) continue;
    const aqui = loc.get(nombre);
    if (!aqui) { diferencias.push(`falta ${nombre}`); continue; }
    for (const f of fuentes) if (!aqui.has(f)) diferencias.push(`${nombre}: falta ${f}`);
    for (const f of aqui) if (!fuentes.has(f) && !extra.has(f)) diferencias.push(`${nombre}: sobra ${f}`);
  }
  for (const nombre of loc.keys()) if (!pro.has(nombre)) diferencias.push(`sobra la directiva ${nombre}`);
  return diferencias;
};

// Las CSP de vite.config.js: la de preview (securityHeaders) y la de desarrollo (devHeaders)
const VITE = leer('vite.config.js');
const cspDeVite = [...VITE.matchAll(/'Content-Security-Policy':\s*"([^"]+)"/g)].map((m) => m[1]);
const NGINX = leer('nginx-security-headers.conf');
const cspDeNginx = NGINX.match(/add_header Content-Security-Policy "([^"$]+)/)[1];

describe('cabeceras de seguridad: las copias como producción (FE-04/FE-05)', () => {
  it('vite.config.js tiene las dos CSP (preview y desarrollo)', () => {
    expect(cspDeVite).toHaveLength(2);
  });

  it('la CSP de preview es la de producción, más la API local', () => {
    expect(comparaCsp(cspDeVite[0], EXTRA_LOCAL)).toEqual([]);
  });

  it('la CSP de desarrollo es la de producción, más lo que pide Vite', () => {
    expect(comparaCsp(cspDeVite[1], EXTRA_DESARROLLO)).toEqual([]);
  });

  it('la CSP del nginx del Kind es la de producción, más la API local', () => {
    expect(comparaCsp(cspDeNginx, EXTRA_LOCAL)).toEqual([]);
  });

  it('ninguna CSP abre Sentry con comodín ni Google Fonts (FE-04)', () => {
    for (const csp of [...cspDeVite, cspDeNginx, RAIZ_DE_PRO['content-security-policy']]) {
      expect(csp).not.toMatch(/\*\.ingest\.sentry\.io|fonts\.googleapis\.com|fonts\.gstatic\.com/);
    }
  });

  it.each([
    ['Cross-Origin-Opener-Policy', 'same-origin'],
    ['Cross-Origin-Resource-Policy', 'same-origin'],
  ])('%s: %s en Vite, en el nginx del Kind y en producción (FE-05)', (cabecera, valor) => {
    expect(RAIZ_DE_PRO[cabecera.toLowerCase()]).toBe(valor);
    expect(VITE).toContain(`'${cabecera}': '${valor}'`);
    expect(NGINX).toMatch(new RegExp(`add_header ${cabecera} (?:"${valor}"|\\$corp) always;`));
  });

  it('en el Kind, /images/ va con CORP cross-origin, como en producción (el logo de los correos)', () => {
    // La de /images/ en el fichero (el logo de los correos), sin nombrar la marca (BrandMark.test)
    const [, deImagenes] = Object.entries(PRODUCCION.rutas).find(([ruta]) => ruta.startsWith('/images/'));
    expect(deImagenes['cross-origin-resource-policy']).toBe('cross-origin');
    expect(leer('nginx.conf')).toMatch(/map \$uri \$corp \{\s*~\^\/images\/\s+cross-origin;\s*default\s+same-origin;/);
  });

  it('Trusted Types solo en aviso, en las copias y en producción (FE-04)', () => {
    expect(RAIZ_DE_PRO['content-security-policy-report-only']).toMatch(/^require-trusted-types-for 'script';/);
    expect(VITE).toContain(`'Content-Security-Policy-Report-Only': "require-trusted-types-for 'script';"`);
    expect(NGINX).toContain(`add_header Content-Security-Policy-Report-Only "require-trusted-types-for 'script';" always;`);
  });

  it('en producción, los avisos de la CSP van al proyecto del front en Sentry', () => {
    expect(PRODUCCION.sentry_csp).toMatch(
      /^https:\/\/o4510427294662656\.ingest\.de\.sentry\.io\/api\/4510427296825424\/security\/\?sentry_key=[0-9a-f]{32}&sentry_environment=production$/,
    );
    expect(RAIZ_DE_PRO['reporting-endpoints']).toBe('csp="{sentry_csp}"');
    expect(RAIZ_DE_PRO['content-security-policy']).toMatch(/report-uri \{sentry_csp\}; report-to csp$/);
  });
});
