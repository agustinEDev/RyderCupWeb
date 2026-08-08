import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Footer from './Footer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es', changeLanguage: vi.fn() },
  }),
}));

function mockMatchMedia(matches) {
  window.matchMedia = vi.fn(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );

/**
 * El pie de marketing delata la aplicacion instalada como un sitio web: ninguna
 * aplicacion nativa termina cada pantalla con redes sociales y copyright
 * (FE #309).
 */
describe('Footer', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window.navigator, 'standalone', { value: undefined, configurable: true });
  });

  it('renders in a browser tab', () => {
    mockMatchMedia(false);

    renderFooter();

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
  });

  it('disappears when the app runs installed', () => {
    mockMatchMedia(true);

    const { container } = renderFooter();

    expect(container).toBeEmptyDOMElement();
  });

  it('disappears when installed on iOS', () => {
    // iOS no implementa display-mode de forma fiable
    mockMatchMedia(false);
    Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true });

    const { container } = renderFooter();

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the legal links reachable in a browser tab', () => {
    // Instalada no se pintan: su unico acceso pasa a ser Perfil
    mockMatchMedia(false);

    renderFooter();

    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/terms', '/privacy', '/cookies']));
  });
});
