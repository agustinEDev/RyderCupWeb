import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Toaster } from 'react-hot-toast';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Colocacion de los toasts frente a la navegacion inferior (FE #322).
 *
 * react-hot-toast fija su contenedor con `bottom: 16px` en un style inline, y
 * la navegacion inferior ocupa esa misma franja: sin desfase el toast la tapa.
 * jsdom no aplica hojas de estilo ni resuelve `env(safe-area-inset-*)`, asi que
 * lo unico verificable aqui es que la clase llega al contenedor y que la regla
 * sigue declarada. El resultado visual hay que mirarlo en un dispositivo real.
 */

const read = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('toast placement', () => {
  it('lets react-hot-toast take a class on its container', () => {
    // Si una futura version renombra la prop, el desfase dejaria de aplicarse
    // en silencio: el toast volveria a taparse contra la navegacion
    const { container } = render(<Toaster containerClassName="toast-container-above-bottom-nav" />);

    expect(container.querySelector('.toast-container-above-bottom-nav')).not.toBeNull();
  });

  it('declares the offset that clears the bottom navigation', () => {
    const css = read('src/index.css');

    expect(css).toContain('.toast-container-above-bottom-nav');
    expect(css).toContain('bottom: calc(6rem + env(safe-area-inset-bottom)) !important');
  });

  it('restores the default offset from md upwards', () => {
    // Por encima de `md` la navegacion inferior no se pinta (`md:hidden`)
    const css = read('src/index.css');
    const mediaQuery = css.match(/@media \(min-width: 768px\) \{[^}]*\.toast-container-above-bottom-nav \{[^}]*\}/s);

    expect(mediaQuery).not.toBeNull();
    expect(mediaQuery[0]).toContain('bottom: 16px !important');
  });

  it('ties the offset to the bottom navigation being visible', () => {
    const app = read('src/App.jsx');

    expect(app).toContain("containerClassName={showBottomNav ? 'toast-container-above-bottom-nav' : undefined}");
  });

  it('mounts a single Toaster, inside App', () => {
    // Dos <Toaster> sin `toasterId` propio pintarian cada notificacion por
    // duplicado, y el de main.jsx no conoce `showBottomNav`
    expect(read('src/App.jsx')).toContain('<Toaster');
    expect(read('src/main.jsx')).not.toContain('<Toaster');
  });
});
