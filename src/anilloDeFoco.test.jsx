import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import PasswordInput from './components/ui/PasswordInput';
import EmailVerificationBanner from './components/EmailVerificationBanner';

/**
 * El anillo de foco en el verde de la marca (22 oct).
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
    const sinReemplazo = reglas().filter(
      (r) => /outline:\s*(none|0)\b/.test(r.cuerpo) && !/box-shadow:|outline:(?!\s*(none|0)\b)/.test(r.cuerpo)
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
