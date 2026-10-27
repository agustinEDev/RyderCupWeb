import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// Lo que usa `@tailwindcss/postcss` por dentro: compila el `index.css` de verdad
import { compile } from '@tailwindcss/node';

/**
 * Los colores de la marca con opacidad (pasada del Kind, 27 oct 2026).
 *
 * `index.css` definía cada color solo por su escala (`--color-primary-50` … `-950`)
 * y unas utilidades a mano. Tailwind no generaba `bg-primary/90`, `ring-primary/20`,
 * `border-primary/30` ni `bg-accent/90`, usadas en 70 ficheros: ni el hover de los
 * botones, ni los anillos de foco, ni los fondos suaves; y el cuadro de la invitación
 * salía con borde negro. jsdom no pinta CSS, así que ningún render lo nota: de ahí
 * que esto compile el tema y mire lo que sale.
 */
const SRC = resolve(process.cwd(), 'src');
let tailwind;

beforeAll(async () => {
  tailwind = await compile(readFileSync(resolve(SRC, 'index.css'), 'utf8'), { base: SRC, onDependency() {} });
});

/** La regla entera de una clase, contando llaves (lleva un `@supports` dentro). */
const reglaDe = (clase) => {
  const css = tailwind.build([clase]);
  const inicio = css.indexOf(`.${clase.replace('/', '\\/')} {`);
  if (inicio < 0) return null;
  let profundidad = 0;
  for (let i = css.indexOf('{', inicio); i < css.length; i++) {
    if (css[i] === '{') profundidad++;
    else if (css[i] === '}' && --profundidad === 0) return css.slice(inicio, i + 1);
  }
  return null;
};

// El tono de cada color «a secas»: el de las utilidades que había a mano
const TONOS = {
  primary: ['#16a34a', '--color-primary-500'],
  secondary: ['#1e3a5f', '--color-secondary-500'],
  accent: ['#d4af37', '--color-accent-500'],
  navy: ['#1e3a5f', '--color-navy-800'],
};
// Con su tono de verdad: el hexadecimal en la regla, o la variable y, en lo
// que compila Tailwind, que esa variable vale ese hexadecimal (CodeRabbit)
const conSuTono = (regla, color, css) => {
  const [hex, variable] = TONOS[color];
  if (regla.toLowerCase().includes(hex)) return true;
  return regla.includes(`var(${variable})`) && css.toLowerCase().includes(`${variable}: ${hex}`);
};

describe('colores de marca', () => {
  it.each([
    ['bg-primary/90', 'primary', 'background-color'],
    ['bg-primary/5', 'primary', 'background-color'],
    ['border-primary/30', 'primary', 'border-color'],
    ['ring-primary/20', 'primary', '--tw-ring-color'],
    ['bg-accent/90', 'accent', 'background-color'],
  ])('%s existe, con su tono y su opacidad', (clase, color, propiedad) => {
    const regla = reglaDe(clase);
    const opacidad = clase.split('/')[1];

    expect(regla).not.toBeNull();
    expect(regla).toContain(propiedad);
    expect(conSuTono(regla, color, tailwind.build([clase]))).toBe(true);
    expect(regla).toMatch(new RegExp(`\\b${opacidad}%`));
  });

  it.each([
    ['bg-primary', 'primary'],
    ['text-primary', 'primary'],
    ['border-primary', 'primary'],
    ['bg-secondary', 'secondary'],
    ['text-secondary', 'secondary'],
    ['bg-accent', 'accent'],
    ['text-accent', 'accent'],
    ['bg-navy', 'navy'],
  ])('%s sigue siendo el de siempre', (clase, color) => {
    const regla = reglaDe(clase);

    expect(regla).not.toBeNull();
    expect(conSuTono(regla, color, tailwind.build([clase]))).toBe(true);
  });
});
