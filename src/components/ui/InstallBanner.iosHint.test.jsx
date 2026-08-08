import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import InstallBanner from './InstallBanner';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'es', changeLanguage: vi.fn() },
  }),
}));

const hookState = vi.hoisted(() => ({ current: {} }));

vi.mock('../../hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => hookState.current,
}));

const onIOS = (iosInstallRoute) => {
  hookState.current = {
    canInstall: true,
    isIOS: true,
    iosInstallRoute,
    isDesktopSafari: false,
    install: vi.fn(),
    dismiss: vi.fn(),
  };
};

/**
 * Instrucciones de instalacion en iOS (FE #332).
 *
 * iOS no ofrece ninguna via programatica de instalacion, asi que este texto es
 * lo unico que lleva al usuario a instalar la aplicacion: tiene que decir que
 * icono buscar y donde esta.
 */
describe('InstallBanner iOS hint', () => {
  beforeEach(() => {
    hookState.current = {};
  });

  it('does not promise a position on iPhone, where Share lives inside a menu', () => {
    // Corregido con un iPhone delante: el boton Compartir no esta en la barra
    onIOS('safari-iphone');

    render(<InstallBanner />);

    expect(screen.getByText('installBanner.iosHint.iphone')).toBeInTheDocument();
    expect(screen.queryByText(/inBottomBar/)).not.toBeInTheDocument();
  });

  it('sends iPad users to the top bar', () => {
    // La barra de compartir de Safari cambia de sitio entre iPhone y iPad
    onIOS('safari-ipad');

    render(<InstallBanner />);

    expect(screen.getByText(/installBanner.iosHint.inTopBar/)).toBeInTheDocument();
  });

  it('claims no position on a non-Safari browser', () => {
    // Chrome, Firefox y Edge en iOS llegan por su propio menu
    onIOS('other-browser');

    render(<InstallBanner />);

    expect(screen.getByText('installBanner.iosHint.otherBrowser')).toBeInTheDocument();
    expect(screen.queryByText(/inBottomBar|inTopBar/)).not.toBeInTheDocument();
  });

  it('draws the share icon only where a position is claimed', () => {
    // Solo el iPad tiene Compartir directamente en la barra: ahi el icono
    // ayuda. En el iPhone y en otros navegadores, dibujarlo manda a buscar
    // algo que no esta a la vista
    onIOS('safari-ipad');
    const { container: ipad } = render(<InstallBanner />);
    const ipadIcons = ipad.querySelectorAll('svg').length;

    onIOS('other-browser');
    const { container: other } = render(<InstallBanner />);

    expect(ipadIcons).toBe(other.querySelectorAll('svg').length + 1);
  });

  it('keeps the dismiss control on every route', () => {
    for (const route of ['safari-iphone', 'safari-ipad', 'other-browser']) {
      hookState.current = {};
      onIOS(route);
      const { unmount } = render(<InstallBanner />);

      expect(screen.getByLabelText('installBanner.dismiss')).toBeInTheDocument();
      unmount();
    }
  });
});
