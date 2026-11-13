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

/** Las cabeceras de `securityHeaders` en vite.config.js, con el nombre en minúsculas. */
const cabecerasDeVite = () => {
  const bloque = VITE.match(/const securityHeaders = \{\n([\s\S]*?)\n\}/)[1];
  return new Map(
    [...bloque.matchAll(/^\s*'([A-Za-z-]+)':\s*(?:'([^']*)'|"([^"]*)")/gm)].map((m) => [m[1].toLowerCase(), m[2] ?? m[3]]),
  );
};

/** Las `add_header` del fragmento del Kind; `$corp` es el map de nginx.conf (same-origin salvo /images/). */
const cabecerasDeNginx = () =>
  new Map(
    [...NGINX.matchAll(/^add_header ([A-Za-z-]+) (?:"([^"]*)"|\$(\w+)) always;/gm)].map((m) => [
      m[1].toLowerCase(),
      m[3] === 'corp' ? 'same-origin' : (m[2] ?? `$${m[3]}`).replace('${csp_upgrade}', ''),
    ]),
  );

// Todas las de seguridad que sirve producción. Si se quita una del JSON, falla aquí
const CABECERAS = [
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'strict-transport-security',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'reporting-endpoints',
  'content-security-policy',
];
// Lo que una copia no lleva, y por qué: HSTS en el Vite de http://localhost fijaría HTTPS
// para localhost en el navegador; reporting-endpoints solo nombra el Sentry de producción
const NO_LAS_LLEVA = {
  'vite.config.js': new Set(['strict-transport-security', 'reporting-endpoints']),
  'nginx-security-headers.conf': new Set(['reporting-endpoints']),
};
// Lo que solo llevan las copias: Trusted Types en aviso (en producción, aplazado a la fase 5)
const SOLO_EN_LOCAL = new Set(['content-security-policy-report-only']);

/** Lo que falta, sobra o no coincide en una copia frente a producción. */
const comparaCabeceras = (copia, noLasLleva) => {
  const diferencias = [];
  for (const [nombre, valor] of Object.entries(RAIZ_DE_PRO)) {
    if (nombre.startsWith('_') || noLasLleva.has(nombre)) continue;
    if (!copia.has(nombre)) { diferencias.push(`falta ${nombre}`); continue; }
    if (nombre === 'content-security-policy') continue; // directiva a directiva, en sus tests
    if (copia.get(nombre) !== valor) diferencias.push(`${nombre}: «${copia.get(nombre)}», se espera «${valor}»`);
  }
  for (const nombre of copia.keys()) {
    if (!(nombre in RAIZ_DE_PRO) && !SOLO_EN_LOCAL.has(nombre)) diferencias.push(`sobra ${nombre}`);
    if (noLasLleva.has(nombre)) diferencias.push(`sobra ${nombre} (no la lleva esta copia)`);
  }
  return diferencias;
};

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

  it('producción trae todas las cabeceras de seguridad, ni una más (#1100)', () => {
    expect(Object.keys(RAIZ_DE_PRO).filter((n) => !n.startsWith('_')).sort()).toEqual([...CABECERAS].sort());
  });

  it('la CSP de producción cierra el marco, los objetos y la base, y no abre los scripts', () => {
    const pro = directivas(RAIZ_DE_PRO['content-security-policy']);
    expect([...pro.get('frame-ancestors')]).toEqual(["'none'"]);
    expect([...pro.get('object-src')]).toEqual(["'none'"]);
    expect([...pro.get('base-uri')]).toEqual(["'self'"]);
    expect([...pro.get('script-src')]).toEqual(["'self'"]);
  });

  it.each([
    ['vite.config.js', cabecerasDeVite],
    ['nginx-security-headers.conf', cabecerasDeNginx],
  ])('%s lleva cada cabecera de producción con el mismo valor, y nada más (#1100)', (fichero, lee) => {
    expect(comparaCabeceras(lee(), NO_LAS_LLEVA[fichero])).toEqual([]);
  });

  it('el Vite de desarrollo hereda las de preview (solo cambia la CSP)', () => {
    expect(VITE).toMatch(/const devHeaders = \{\s*\.\.\.securityHeaders,\s*'Content-Security-Policy': "[^"]+"\s*\}/);
  });

  it('el analizador de las copias ve todas sus cabeceras', () => {
    expect([...cabecerasDeVite().keys()]).toHaveLength(8);
    expect([...cabecerasDeNginx().keys()]).toHaveLength(9);
    expect(cabecerasDeNginx().get('content-security-policy')).toBe(cspDeNginx);
  });

  it('en el Kind, /images/ va con CORP cross-origin, como en producción (el logo de los correos)', () => {
    // La de /images/ en el fichero (el logo de los correos), sin nombrar la marca (BrandMark.test)
    const [, deImagenes] = Object.entries(PRODUCCION.rutas).find(([ruta]) => ruta.startsWith('/images/'));
    expect(deImagenes['cross-origin-resource-policy']).toBe('cross-origin');
    expect(leer('nginx.conf')).toMatch(/map \$uri \$corp \{\s*~\^\/images\/\s+cross-origin;\s*default\s+same-origin;/);
  });

  it('Trusted Types solo en aviso y solo en local; en producción, aplazado a la fase 5 (FE-04)', () => {
    // En producción saltaría en cada carga (service worker, workers, MapLibre) y gastaría la
    // cuota de Sentry (decidido el 11 nov 2026)
    expect(RAIZ_DE_PRO).not.toHaveProperty('content-security-policy-report-only');
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
