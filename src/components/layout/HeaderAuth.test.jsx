import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import HeaderAuth from './HeaderAuth';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../ui/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher" />,
}));

vi.mock('../../composition', () => ({
  logoutUseCase: { execute: vi.fn() },
}));

vi.mock('../../utils/broadcastAuth', () => ({
  broadcastLogout: vi.fn(),
}));

const user = { first_name: 'Ana', last_name: 'Soto', is_admin: false };

const renderHeader = (path, props = {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <HeaderAuth user={user} {...props} />
    </MemoryRouter>
  );

/**
 * Cabecera contextual en movil (FE #310): decir donde estas y como volver, en
 * lugar de repetir la marca en cada pantalla.
 */
describe('HeaderAuth', () => {
  it('shows the screen title instead of the brand on mobile', () => {
    renderHeader('/profile/devices');

    expect(screen.getByRole('heading', { level: 1, name: 'screens.devices' })).toBeInTheDocument();
  });

  it('offers a back arrow to the parent screen', () => {
    renderHeader('/profile/devices');

    expect(screen.getByRole('link', { name: 'back' })).toHaveAttribute('href', '/profile');
  });

  it('omits the back arrow on a bottom-navigation root', () => {
    renderHeader('/dashboard');

    expect(screen.queryByRole('link', { name: 'back' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'screens.dashboard' })).toBeInTheDocument();
  });

  it('lets a page override the title with a runtime name', () => {
    // El nombre de un torneo no cabe en un mapa estatico
    renderHeader('/competitions/abc-123', { title: 'Copa de Otoño' });

    expect(screen.getByRole('heading', { level: 1, name: 'Copa de Otoño' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'back' })).toHaveAttribute('href', '/competitions');
  });

  it('lets a page drop the back arrow explicitly', () => {
    renderHeader('/profile/devices', { backTo: null });

    expect(screen.queryByRole('link', { name: 'back' })).not.toBeInTheDocument();
  });

  it('keeps the brand on a route outside the map', () => {
    // Alta de perfil: no es una pantalla de la aplicacion todavia
    renderHeader('/auth/complete-profile');

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByAltText('RCF Logo').length).toBeGreaterThan(0);
  });

  it('keeps the desktop navigation untouched', () => {
    renderHeader('/profile/devices');

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/dashboard', '/browse-competitions', '/competitions']));
  });
});
