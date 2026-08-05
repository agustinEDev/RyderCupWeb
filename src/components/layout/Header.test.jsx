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
});
