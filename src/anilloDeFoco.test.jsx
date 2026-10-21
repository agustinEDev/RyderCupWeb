import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import PasswordInput from './components/ui/PasswordInput';
import EmailVerificationBanner from './components/EmailVerificationBanner';

/**
 * El anillo de foco en el verde de la marca (21 oct).
 *
 *   #   caso                                              | se comprueba
 *   ----|-------------------------------------------------|------------------------------
 *   F1  con teclado, todo lo enfocable lleva anillo verde | regla `:focus-visible` con
 *                                                         | `outline` en el primario
 *   F2  con ratón o dedo no aparece                       | solo `:focus-visible`, nunca
 *                                                         | un `:focus` global con outline;
 *                                                         | los botones con anillo propio lo
 *                                                         | llevan en `focus-visible:`
 *   F3  nunca `outline: none` sin reemplazo (WCAG 2.4.7)  | cada `outline: none` del CSS
 *                                                         | trae box-shadow u outline; los
 *                                                         | botones que lo quitaban, ya no
 *   F4  un anillo propio no se suma al global             | todo `className` con
 *                                                         | `focus:ring-N` lleva
 *                                                         | `focus:outline-none`
 *   F5  los botones del mapa, con el suyo                 | MapLibre pinta su sombra: el
 *                                                         | global se quita ahí
 *
 * jsdom no pinta `:focus-visible`, así que el CSS se comprueba en el fichero,
 * como en mobileInputZoom.test.js.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k, ready: true, i18n: { language: 'es' } }),
  Trans: ({ i18nKey }) => i18nKey,
}));

vi.mock('./composition', () => ({ resendVerificationEmailUseCase: { execute: vi.fn() } }));

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** Las reglas `selector { cuerpo }` sin anidar, con su posición. */
const reglas = () =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim(),
    cuerpo: m[2],
    inicio: m.index,
  }));

const reglaDeFoco = () =>
  reglas().find((r) => /(^|,|\s):focus-visible\b/.test(r.selector) && /outline:/.test(r.cuerpo));

describe('anillo de foco en el verde de la marca', () => {
  it('F1: hay una regla global :focus-visible con el outline en el primario', () => {
    const regla = reglaDeFoco();
    expect(regla).toBeDefined();
    // Global: el selector es el pseudo a secas, sin elemento ni clase delante
    expect(regla.selector).toMatch(/^:focus-visible$/);
    expect(regla.cuerpo).toMatch(/outline:\s*2px\s+solid\s+var\(--color-primary-\d+\)/);
    expect(regla.cuerpo).toMatch(/outline-offset:\s*2px/);
  });

  it('F1: vive en @layer base, para que el anillo propio de un componente le gane', () => {
    const { inicio } = reglaDeFoco();
    const antes = css.slice(0, inicio);
    // La apertura de verdad, no una mención en un comentario
    const aperturas = [...antes.matchAll(/@layer\s+(\w+)\s*\{/g)];
    expect(aperturas.at(-1)?.[1]).toBe('base');
    const ultimaCapa = aperturas.at(-1).index;
    // Sin cerrar la capa entre medias
    const tramo = antes.slice(ultimaCapa);
    const abiertas = (tramo.match(/\{/g) || []).length - (tramo.match(/\}/g) || []).length;
    expect(abiertas).toBeGreaterThan(0);
  });

  it('F2: ninguna regla de :focus a secas pinta un outline en todo', () => {
    const globales = reglas().filter(
      (r) => /(^|,)\s*(\*\s*)?:focus(?![-\w])/.test(r.selector) && /outline:(?!\s*none\b)/.test(r.cuerpo)
    );
    expect(globales).toEqual([]);
  });

  it('F3: cada outline: none del CSS trae un reemplazo visible', () => {
    // Los del mapa, no: su reemplazo está en la hoja de MapLibre (F5)
    const delMapa = (selector) => selector.split(',').every((s) => s.trim().startsWith('.maplibregl-'));
    const sinReemplazo = reglas().filter(
      (r) =>
        /outline:\s*(none|0)\b/.test(r.cuerpo) &&
        !/box-shadow:|outline:(?!\s*(none|0)\b)/.test(r.cuerpo) &&
        !delMapa(r.selector)
    );
    expect(sinReemplazo.map((r) => r.selector)).toEqual([]);
  });

  it('F3: el ojo de la contraseña ya no se queda sin anillo', () => {
    render(<PasswordInput name="password" value="" onChange={() => {}} />);
    const ojo = screen.getByRole('button', { name: 'Show password' });
    expect(ojo.className).not.toMatch(/(^|\s)focus:outline-none/);
  });

  it('F3: la X del aviso de verificar el correo ya no se queda sin anillo', () => {
    render(<EmailVerificationBanner userEmail="a@b.c" />);
    const cerrar = screen.getAllByRole('button', { name: 'emailVerification.dismiss' });
    expect(cerrar).toHaveLength(2);
    for (const b of cerrar) expect(b.className).not.toMatch(/(^|\s)focus:outline-none/);
  });
});

/** Los `className=` de un fichero: el literal o la expresión entre llaves. */
const atributosDeClase = (codigo) => {
  const valores = [];
  for (const m of codigo.matchAll(/className=/g)) {
    let i = m.index + 'className='.length;
    const abre = codigo[i];
    if (abre === '"' || abre === "'") {
      valores.push(codigo.slice(i + 1, codigo.indexOf(abre, i + 1)));
      continue;
    }
    if (abre !== '{') continue;
    let nivel = 0;
    const desde = i;
    for (; i < codigo.length; i += 1) {
      if (codigo[i] === '{') nivel += 1;
      else if (codigo[i] === '}' && --nivel === 0) break;
    }
    valores.push(codigo.slice(desde, i + 1));
  }
  return valores;
};

// Pinta un anillo: con grosor (`focus:ring`, `focus:ring-2`, `focus:ring-[3px]`).
// `focus:ring-primary` solo da el color, y sin grosor no se ve
const BORDE = '(?:^|[\\s\'"`{])';
const FIN = '(?=[\\s\'"`}]|$)';
const PINTA_ANILLO = new RegExp(BORDE + 'focus(?:-visible)?:ring(?:-(?:\\d+|\\[[^\\]]+\\]))?' + FIN);
const QUITA_EL_OUTLINE = new RegExp(BORDE + '(?:focus:|focus-visible:)?outline-(?:none|0|hidden)' + FIN);

/** Los `.jsx` de `src`, sin los tests. */
const ficherosJsx = (dir = resolve(process.cwd(), 'src')) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) return ficherosJsx(ruta);
    return e.name.endsWith('.jsx') && !e.name.includes('.test.') ? [ruta] : [];
  });

describe('un anillo propio sustituye al global, no se suma (F4)', () => {
  it('el detector distingue lo que pinta anillo de lo que solo le da color', () => {
    expect(PINTA_ANILLO.test('"px-3 focus:ring-2 focus:ring-primary"')).toBe(true);
    expect(PINTA_ANILLO.test('`a ${x ? \'focus-visible:ring-2\' : \'\'}`')).toBe(true);
    expect(PINTA_ANILLO.test('"a focus:ring b"')).toBe(true);
    expect(PINTA_ANILLO.test('"text-primary focus:ring-primary focus:ring-offset-2"')).toBe(false);
    expect(QUITA_EL_OUTLINE.test('"focus:outline-none focus:ring-2"')).toBe(true);
    expect(QUITA_EL_OUTLINE.test('"focus:outline-primary"')).toBe(false);
  });

  it('el test lee de verdad los componentes', () => {
    const conAnillo = ficherosJsx().flatMap((f) => atributosDeClase(readFileSync(f, 'utf8'))).filter((v) => PINTA_ANILLO.test(v));
    expect(conAnillo.length).toBeGreaterThan(20);
  });

  it('F4: todo elemento con focus:ring de grosor quita también el outline', () => {
    const raiz = process.cwd();
    const dobles = ficherosJsx().flatMap((f) =>
      atributosDeClase(readFileSync(f, 'utf8'))
        .filter((v) => PINTA_ANILLO.test(v) && !QUITA_EL_OUTLINE.test(v))
        .map((v) => `${relative(raiz, f)}: ${v.replace(/\s+/g, ' ').slice(0, 90)}`)
    );
    expect(dobles).toEqual([]);
  });
});

describe('los botones del mapa (F5)', () => {
  const maplibre = readFileSync(resolve(process.cwd(), 'node_modules/maplibre-gl/dist/maplibre-gl.css'), 'utf8');

  it('F5: MapLibre trae su propia marca de foco en esos botones', () => {
    expect(maplibre).toMatch(/\.maplibregl-ctrl-group button:focus:focus-visible\{box-shadow:[^}]+\}/);
    expect(maplibre).toMatch(/\.maplibregl-ctrl-attrib-button:focus[,{][^}]*box-shadow/);
  });

  it('F5: el global no se le suma: outline none en sus botones, en base', () => {
    const regla = reglas().find(
      (r) => /\.maplibregl-ctrl-group button:focus-visible/.test(r.selector) && /outline:\s*none/.test(r.cuerpo)
    );
    expect(regla).toBeDefined();
    expect(regla.selector).toMatch(/\.maplibregl-ctrl-attrib-button:focus-visible/);
    expect(regla.inicio).toBeGreaterThan(reglaDeFoco().inicio);
  });
});
