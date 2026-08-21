import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * El zoom que se quedaba puesto en el iPhone (FE #441).
 *
 * Safari en iOS amplia la pagina al enfocar un campo de texto cuya letra mide
 * menos de 16px, y no la devuelve al soltarlo. Como esto es una SPA, la escala
 * se hereda: buscabas un amigo y su perfil aparecia gigante, aunque el campo
 * pequeno estuviera en la pantalla anterior.
 *
 * La regla que lo arregla vive en `index.css` y no en los 38 campos que estaban
 * a 14px, asi que un refactor del CSS se la puede llevar por delante sin que
 * ningun render lo note: jsdom no aplica media queries y el defecto solo se ve
 * en un telefono de verdad. De ahi que esto sean aserciones sobre el fichero.
 *
 * Se busca por CONTENIDO y no por formato: reordenar los selectores o juntarlos
 * en una linea no cambia nada y no debe tumbar estas pruebas.
 */

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

/** Recorta el bloque `{ ... }` que empieza en `desde`, contando llaves. */
const bloqueDesde = (desde) => {
  let profundidad = 0;
  for (let i = css.indexOf('{', desde); i < css.length; i++) {
    if (css[i] === '{') profundidad++;
    else if (css[i] === '}' && --profundidad === 0) return css.slice(desde, i + 1);
  }
  return null;
};

/** La media query que sube los campos a 16px: `{ inicio, texto, condicion }`. */
const reglaDeCampos = () => {
  for (const m of css.matchAll(/@media\b/g)) {
    const texto = bloqueDesde(m.index);
    if (!texto) continue;
    if (/font-size:\s*16px/.test(texto) && /\binput\b/.test(texto)) {
      return { inicio: m.index, texto, condicion: texto.slice(0, texto.indexOf('{')) };
    }
  }
  return null;
};

/** true si el offset cae dentro de un `@layer ... { ... }`. */
const dentroDeUnaCapa = (offset) => {
  for (const m of css.matchAll(/@layer\s+[\w\s,]*\{/g)) {
    const capa = bloqueDesde(m.index);
    if (capa && offset > m.index && offset < m.index + capa.length) return true;
  }
  return false;
};

describe('campos de formulario en movil (FE #441)', () => {
  // Si la regla desaparece, todo lo de abajo perderia su sentido y alguna
  // asercion pasaria en vacio. Se comprueba una vez, y en alto.
  it('la regla existe', () => {
    expect(reglaDeCampos()).not.toBeNull();
  });

  it('sube la letra de los campos a 16px', () => {
    const { texto } = reglaDeCampos();
    expect(texto).toMatch(/font-size:\s*16px/);
    expect(texto).toMatch(/\bselect\b/);
    expect(texto).toMatch(/\btextarea\b/);
  });

  it('se activa por dispositivo tactil, no solo por pantalla estrecha', () => {
    // Un iPhone en horizontal declara 932px y un iPad 768 o mas: con un
    // `max-width: 767px` a secas, los aparatos que hacen el zoom se quedan
    // fuera justo cuando se gira el telefono.
    const { condicion } = reglaDeCampos();
    expect(condicion).toMatch(/hover:\s*none/);
    expect(condicion).toMatch(/pointer:\s*coarse/);
  });

  it('se queda fuera de @layer, que es de lo que depende que gane', () => {
    // Las utilidades de Tailwind ganan a `base` por orden de capa, no por
    // especificidad: envolver esto en `@layer base` —una limpieza de lo mas
    // natural— deja de aplicarlo frente a `text-sm` y devuelve el defecto.
    const regla = reglaDeCampos();
    expect(regla).not.toBeNull();
    expect(dentroDeUnaCapa(regla.inicio)).toBe(false);
  });

  it('deja fuera los campos que piden una letra mayor', () => {
    // El panel de anotar golpes usa text-lg y ahi el numero grande es
    // deliberado: la regla no puede encogerlo a 16px.
    expect(reglaDeCampos().texto).toMatch(/:not\(\.text-lg\)/);
  });

  it('no la aplica en escritorio con raton', () => {
    // Cualquier font-size para campos fuera de la media query cambiaria el
    // diseno de escritorio, que no es lo que se venia a arreglar.
    const regla = reglaDeCampos();
    expect(regla).not.toBeNull();
    const fuera = css.replace(regla.texto, '');
    expect(fuera).not.toMatch(/^\s*(input|select|textarea)[^{]*\{[^}]*font-size/m);
  });

  it('quita el doble-toque-para-ampliar de los elementos pulsables', () => {
    // Un doble toque rapido en un boton lo interpreta el movil como «amplia
    // aqui». manipulation solo se lleva eso; el pinch para acercar sigue.
    const regla = css.match(/(?:^|\n)\s*button[^{]*\{[^}]*touch-action:\s*manipulation[^}]*\}/);
    expect(regla).not.toBeNull();
    expect(regla[0]).toMatch(/\[role='button'\]/);
    expect(regla[0]).toMatch(/(?:^|,)\s*a\s*[,{]/m);
  });

  it('deja el touch-action DENTRO de @layer base, al reves que la regla de arriba', () => {
    // Es un valor por defecto, no una imposicion: asi una utilidad `touch-none`
    // puntual —un control que se arrastre— le sigue ganando. Sin capa la
    // utilidad no aplicaria y nada en el marcado explicaria por que.
    const i = css.search(/(?:^|\n)\s*button[^{]*\{[^}]*touch-action/);
    expect(i).not.toBe(-1);
    expect(dentroDeUnaCapa(i)).toBe(true);
  });

  it('no desactiva el pinch-zoom en el viewport', () => {
    // El remedio que sale en todas partes es `maximum-scale=1` o
    // `user-scalable=no`, y deja sin ampliar a quien lo necesita para leer.
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html).not.toMatch(/maximum-scale|user-scalable/);
  });
});
