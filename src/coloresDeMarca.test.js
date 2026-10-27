import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * El verde de marca con opacidad (pasada del Kind, 27 oct 2026).
 *
 * `index.css` definía `primary` solo por su escala (`--color-primary-50` … `-950`)
 * y tres utilidades a mano. Tailwind no generaba `bg-primary/90`, `ring-primary/20`
 * ni `border-primary/30`, que se usan en 69 ficheros: ni el hover de los botones,
 * ni los anillos de foco, ni los fondos suaves; y el cuadro de la invitación salía
 * con borde negro. jsdom no pinta CSS, así que ningún render lo nota: de ahí que
 * esto mire el tema. Con `--color-primary` en él, Tailwind genera todo lo demás.
 */
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
const tema = css.slice(css.indexOf('@theme'), css.indexOf('}', css.indexOf('@theme')));

describe('colores de marca', () => {
  it('el tema declara el primario, del que salen sus opacidades', () => {
    expect(tema).toMatch(/--color-primary:\s*var\(--color-primary-500\)/);
  });

  it('sin utilidades a mano que lo pisen: las genera Tailwind desde el tema', () => {
    expect(css).not.toMatch(/@utility (bg|text|border)-primary\b/);
  });
});
