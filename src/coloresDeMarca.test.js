import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// Lo que usa `@tailwindcss/postcss` por dentro: compila el `index.css` de verdad
import { compile } from '@tailwindcss/node';

/**
 * El verde de marca con opacidad (pasada del Kind, 27 oct 2026).
 *
 * `index.css` definía `primary` solo por su escala (`--color-primary-50` … `-950`)
 * y tres utilidades a mano. Tailwind no generaba `bg-primary/90`, `ring-primary/20`
 * ni `border-primary/30`, que se usan en 69 ficheros: ni el hover de los botones,
 * ni los anillos de foco, ni los fondos suaves; y el cuadro de la invitación salía
 * con borde negro. jsdom no pinta CSS, así que ningún render lo nota: de ahí que
 * esto compile el tema y mire lo que sale (revisor: no basta con buscar el texto).
 */
const SRC = resolve(process.cwd(), 'src');
const generado = async (clases) => {
  const tailwind = await compile(readFileSync(resolve(SRC, 'index.css'), 'utf8'), {
    base: SRC,
    onDependency() {},
  });
  return tailwind.build(clases);
};
const reglaDe = (css, clase) => {
  const selector = `.${clase.replace('/', '\\/')} {`;
  const inicio = css.indexOf(selector);
  return inicio < 0 ? null : css.slice(inicio, css.indexOf('}', inicio));
};

describe('colores de marca', () => {
  it.each([
    ['bg-primary/90', 'background-color'],
    ['bg-primary/5', 'background-color'],
    ['border-primary/30', 'border-color'],
    ['ring-primary/20', '--tw-ring-color'],
  ])('%s existe, con el verde de marca', async (clase, propiedad) => {
    const regla = reglaDe(await generado([clase]), clase);

    expect(regla).not.toBeNull();
    expect(regla).toContain(propiedad);
    expect(regla).toMatch(/#16a34a|--color-primary/);
  });

  it.each(['bg-primary', 'text-primary', 'border-primary'])('%s sigue siendo el verde de siempre', async (clase) => {
    expect(reglaDe(await generado([clase]), clase)).toMatch(/var\(--color-primary(-500)?\)|#16a34a/);
  });
});
