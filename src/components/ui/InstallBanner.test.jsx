import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InstallBanner from './InstallBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es', changeLanguage: vi.fn() },
  }),
}));

vi.mock('../../hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({
    canInstall: true,
    isIOS: false,
    isDesktopSafari: false,
    install: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

/**
 * El banner y la navegación inferior comparten el borde de la pantalla: si el
 * banner se queda en bottom-0 tapa la nav entera en móvil (FE #306).
 */
describe('InstallBanner', () => {
  it('sits on the screen edge when there is no bottom nav', () => {
    render(<InstallBanner />);

    const banner = screen.getByTestId('install-banner');
    expect(banner.className).toContain('bottom-0');
    expect(banner.className).toContain('pb-[env(safe-area-inset-bottom)]');
  });

  it('stacks above the bottom nav on mobile when it is visible', () => {
    render(<InstallBanner aboveBottomNav />);

    const banner = screen.getByTestId('install-banner');
    expect(banner.className).toContain('bottom-[calc(4rem+env(safe-area-inset-bottom))]');
    // en escritorio no hay nav inferior: vuelve al borde
    expect(banner.className).toContain('md:bottom-0');
  });
});
