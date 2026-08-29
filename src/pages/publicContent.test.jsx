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
    //
    // Se acepta cualquier nombre de traductor —la página que falló usaba
    // `tComp`—, las tres comillas y también `<Trans i18nKey=...>`. Un barrido
    // sobre el fuente que no reconoce una forma no falla: dice que no hay nada
    const clave = "(?:[\\w-]+:)?footer(?:\\.copyright(?:Short|Long)?)?";
    const llamadas = new RegExp(`\\b[A-Za-z_$][\\w$]*\\(\\s*['"\`]${clave}['"\`]`, 'g');
    const enTrans = new RegExp(`i18nKey\\s*=\\s*[{"']+${clave}["'}]+`, 'g');

    // Solo los argumentos de ESA llamada: mirar los siguientes N caracteres
    // daba por bueno un `year:` de una llamada vecina.
    //
    // Un `t('footer', opciones)` con el objeto en una variable SÍ se marca como
    // fallo, aunque sea correcto: desde el fuente no hay forma de mirar dentro
    // de la variable. Se prefiere ese ruido a lo contrario, porque una guarda
    // que no ve una forma nueva no avisa de nada — dice que no hay fallos. Si
    // aparece ese caso, lo que toca es pasar `year` en la propia llamada
    const argumentosDe = (texto, desde) => {
      let nivel = 0;
      for (let i = desde; i < texto.length; i++) {
        if (texto[i] === '(') nivel++;
        else if (texto[i] === ')') {
          nivel--;
          if (nivel === 0) return texto.slice(desde, i);
        }
      }
      return texto.slice(desde);
    };

    const offenders = [];
    for (const f of files) {
      for (const uso of f.content.matchAll(llamadas)) {
        const abre = f.content.indexOf('(', uso.index);
        // `year` como propiedad, no en cualquier sitio: un
        // `t('footer', { defaultValue: 'year' })` no interpola nada y pasaba
        const pasaElAno = /\byear\s*:/.test(argumentosDe(f.content, abre))
          || /\{[^}]*\byear\b\s*[,}]/.test(argumentosDe(f.content, abre));
        if (!pasaElAno) {
          offenders.push(`${relative(f.path)}: ${uso[0]}`);
        }
      }
      // `<Trans>` no lleva argumentos: el año va por `values` o por un hijo,
      // así que se pide a mano en vez de adivinarlo
      for (const uso of f.content.matchAll(enTrans)) {
        offenders.push(`${relative(f.path)}: ${uso[0]} (usa t() con year, no <Trans>)`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
