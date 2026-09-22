import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Header from './Header';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../ui/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher" />,
}));

const renderHeader = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Header />
    </MemoryRouter>
  );

/**
 * The two actions the site exists for must be reachable without opening the
 * hamburger menu on a phone (FE #314).
 */
describe('Header', () => {
  it('L3: en la portada el idioma sigue en la barra', () => {
    // Quien llega por primera vez no tiene un desplegable de cuenta donde
    // buscarlo; en la cabecera con sesión sí se movió ahí (FE #680)
    renderHeader();

    expect(screen.getAllByTestId('language-switcher').length).toBeGreaterThan(0);
  });

  it('exposes sign in and register without opening the menu', () => {
    renderHeader();

    const loginLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/login');
    const registerLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/register');

    // one in the desktop block, one in the mobile header
    expect(loginLinks).toHaveLength(2);
    expect(registerLinks).toHaveLength(2);
  });

  it('keeps the mobile menu for marketing links only', () => {
    renderHeader();

    fireEvent.click(screen.getByLabelText('Toggle menu'));

    const menu = screen.getByTestId('mobile-menu');
    const menuLinks = within(menu).getAllByRole('link').map((link) => link.getAttribute('href'));

    expect(menuLinks).toContain('/pricing');
    expect(menuLinks).toContain('/contact');
    expect(menuLinks).not.toContain('/login');
    expect(menuLinks).not.toContain('/register');
  });

  it('drops the wordmark on the narrowest viewports so both buttons fit', () => {
    renderHeader();

    expect(screen.getByText('RyderCupFriends').className).toContain('hidden sm:block');
  });

  /**
   * La versión completa necesita 928 px en español, y aparecía desde 768: entre
   * medias la página se desplazaba en horizontal (FE #689). El modo compacto
   * —marca, «Registrarse», «Entrar» y el menú— se mantiene hasta lg.
   */
  describe('el modo compacto llega hasta lg (FE #689)', () => {
    it('C1: la versión completa, solo desde lg', () => {
      // jsdom no mide anchos: se vigila el contrato de clases. Que de verdad
      // quepa se midió con Playwright en los anchos que importan
      renderHeader();

      expect(screen.getByTestId('cabecera-completa')).toHaveClass('hidden', 'lg:flex');
    });

    it('C2: las dos acciones y el menú compactos, hasta lg', () => {
      renderHeader();

      expect(screen.getByTestId('acciones-compactas')).toHaveClass('lg:hidden');
      expect(screen.getByLabelText('Toggle menu').parentElement).toHaveClass('lg:hidden');
    });
  });
});
