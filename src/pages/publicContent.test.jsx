import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Public content (FE #303).
 *
 * The landing and the auth pages used to claim "500+ tournaments", "2K+ players"
 * and "98% satisfaction", none of which were measured, plus a copyright frozen at
 * 2024. Numbers like these tend to creep back in when a page is redesigned, so
 * this scans the source instead of asserting on a single render.
 */

const SRC = resolve(process.cwd(), 'src');

function sourceFiles(dir = SRC, acc = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      sourceFiles(path, acc);
    } else if (/\.(jsx?|json)$/.test(entry) && !entry.includes('.test.')) {
      acc.push(path);
    }
  }
  return acc;
}

const files = sourceFiles().map((path) => ({ path, content: readFileSync(path, 'utf8') }));
const relative = (path) => path.slice(resolve(process.cwd()).length + 1);

describe('public content', () => {
  it.each([
    ['tournament count', /\b500\+/],
    ['player count', /\b2K\+/],
    ['satisfaction rate', /\b98%/],
  ])('has no invented %s', (_label, pattern) => {
    const offenders = files.filter((f) => pattern.test(f.content)).map((f) => relative(f.path));

    expect(offenders).toEqual([]);
  });

  it('makes no unmeasured claim about how many people use the product', () => {
    const pattern = /(miles|cientos) de (golfistas|entusiastas)|(thousands|hundreds) of (golf|amateur)/i;
    const offenders = files.filter((f) => pattern.test(f.content)).map((f) => relative(f.path));

    expect(offenders).toEqual([]);
  });

  it('never hardcodes a copyright year', () => {
    const offenders = files
      .filter((f) => /©\s*\d{4}/.test(f.content))
      .map((f) => relative(f.path));

    expect(offenders).toEqual([]);
  });

  it('never passes a literal year to a copyright string', () => {
    // Interpolating {{year}} is only half the fix: t('footer.copyright', { year: 2024 })
    // would render just as stale without leaving a "© 2024" literal behind.
    const offenders = files
      .filter((f) => /year:\s*\d/.test(f.content))
      .map((f) => relative(f.path));

    expect(offenders).toEqual([]);
  });

  it('interpolates the year into both copyright strings', () => {
    for (const locale of ['es', 'en']) {
      const common = JSON.parse(readFileSync(resolve(SRC, `i18n/locales/${locale}/common.json`), 'utf8'));

      expect(common.footer.copyright).toContain('{{year}}');
      expect(common.footer.copyrightShort).toContain('{{year}}');
    }
  });
  it('passes the year wherever a footer copyright string is rendered', () => {
    // Interpolar la clave no sirve si quien la pinta no manda `year`: en el
    // calendario de competición se leía «© {{year}} RyderCupFriends» tal cual,
    // porque `SchedulePage` llamaba a `t('footer')` a secas mientras las otras
    // tres páginas de competición sí lo pasaban (FE #513)
    // Cualquier nombre, no solo `t`: la página que falló usaba `tComp`
    const usos = /\b[A-Za-z_$][\w$]*\(\s*'(?:[\w-]+:)?footer(?:\.copyright(?:Short)?)?'\s*(,|\))/g;

    const offenders = [];
    for (const f of files) {
      for (const uso of f.content.matchAll(usos)) {
        const desde = uso.index;
        const trozo = f.content.slice(desde, desde + 200);
        if (!/year\s*:/.test(trozo)) offenders.push(`${relative(f.path)}: ${uso[0]}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
