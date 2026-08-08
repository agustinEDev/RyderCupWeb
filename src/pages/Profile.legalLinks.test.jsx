import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Acceso a los legales desde el perfil (FE #309, revision de CodeRabbit en la
 * PR #325).
 *
 * Instalada, `Footer` no se pinta en ningun tamano de pantalla, tampoco en
 * escritorio: una PWA instalada en escritorio existe. Si el grupo "Legal" del
 * perfil quedase dentro del contenedor `md:hidden`, esa combinacion se quedaria
 * sin ningun acceso a condiciones, privacidad y cookies.
 *
 * Es una asercion sobre el fichero porque lo que hay que fijar es una decision
 * de maquetacion condicional: jsdom no aplica media queries ni conoce el modo
 * standalone, asi que un render no distingue `md:hidden` de visible.
 */

const read = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Profile legal links', () => {
  it('ties the legal group visibility to standalone rather than hiding it above md', () => {
    const source = read('src/pages/Profile.jsx');

    // Visible siempre en movil; en escritorio solo cuando no hay pie
    expect(source).toContain("<div className={isStandalone ? '' : 'md:hidden'}>");
  });

  it('reads the standalone mode from the shared hook', () => {
    const source = read('src/pages/Profile.jsx');

    expect(source).toContain("import { useStandalone } from '../hooks/useStandalone'");
    expect(source).toContain('const isStandalone = useStandalone();');
  });

  it('keeps the three legal destinations', () => {
    const source = read('src/pages/Profile.jsx');

    for (const route of ['/terms', '/privacy', '/cookies']) {
      expect(source).toContain(`to="${route}"`);
    }
  });

  it('navigates the account rows with links, not click handlers', () => {
    // SettingsRow solo pinta un <a> cuando recibe `to`; con `onClick` produce un
    // <button>, que no se puede abrir en otra pestana ni se anuncia como enlace.
    // La botonera de escritorio si usa botones con navigate(), y eso es correcto
    // alli: son acciones de una barra, no filas de una lista de ajustes.
    const source = read('src/pages/Profile.jsx');
    const mobileList = source.slice(source.indexOf('<div className="md:hidden">'), source.indexOf('{/* Escritorio'));

    for (const route of ['/profile/edit', '/profile/devices', '/admin']) {
      expect(mobileList).toContain(`to="${route}"`);
    }
    expect(mobileList).not.toContain('navigate(');
  });
});
