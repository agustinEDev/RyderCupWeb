import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import BottomNav from './BottomNav';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es', changeLanguage: vi.fn() },
  }),
}));

// El lanzador monta useAuth (petición a /auth/current-user) solo al pulsar el FAB
const useAuthMock = vi.fn(() => ({ user: null, loading: true }));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

const renderNav = (path = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>
  );

const hrefOf = (label) => screen.getByRole('link', { name: label }).getAttribute('href');

/**
 * Navegación inferior en móvil (FE #306).
 */
describe('BottomNav', () => {
  it('links the four navigation tabs to their pages', () => {
    renderNav();

    expect(hrefOf('bottomNav.home')).toBe('/dashboard');
    expect(hrefOf('bottomNav.tournaments')).toBe('/competitions');
    expect(hrefOf('bottomNav.players')).toBe('/friends');
    expect(hrefOf('bottomNav.profile')).toBe('/profile');
  });

  it('marks the current section as the active page', () => {
    renderNav('/competitions/abc-123');

    expect(screen.getByRole('link', { name: 'bottomNav.tournaments' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'bottomNav.home' })).not.toHaveAttribute('aria-current');
  });

  it('keeps the profile tab active on its subpages', () => {
    renderNav('/profile/edit');

    expect(screen.getByRole('link', { name: 'bottomNav.profile' })).toHaveAttribute('aria-current', 'page');
  });

  it('hides itself on desktop and clears the home indicator', () => {
    renderNav();

    const nav = screen.getByTestId('bottom-nav');
    expect(nav.className).toContain('md:hidden');
    expect(nav.className).toContain('env(safe-area-inset-bottom)');
  });

  it('does not fetch the current user until the quick match FAB is pressed', () => {
    renderNav();

    expect(useAuthMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'bottomNav.quickMatch' }));

    expect(useAuthMock).toHaveBeenCalled();
  });
});
