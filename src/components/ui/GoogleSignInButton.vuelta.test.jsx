import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

/**
 * Al entrar con Google desde el login, se guarda a dónde volver si se llegó desde la
 * página de confirmar el cambio de correo (RyderCupAm #753).
 */
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (clave) => clave }) }));
vi.mock('framer-motion', () => ({
  motion: {
    // Sin las props de animación, que no son del botón
    button: ({ children, ...props }) => (
      <button {...Object.fromEntries(Object.entries(props).filter(([k]) => !k.startsWith('while')))}>
        {children}
      </button>
    ),
  },
}));
const google = vi.hoisted(() => ({ guardaLaVueltaDeGoogle: vi.fn(), buildGoogleOAuthUrl: vi.fn(() => '#google') }));
vi.mock('../../utils/googleOAuth', () => google);

const { default: GoogleSignInButton } = await import('./GoogleSignInButton');

describe('GoogleSignInButton · la vuelta tras Google', () => {
  beforeEach(() => vi.clearAllMocks());

  it('guarda la página de la que se vino al login', () => {
    const from = { pathname: '/confirm-email-change', search: '?token=abc' };
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from } }]}>
        <GoogleSignInButton />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(google.guardaLaVueltaDeGoogle).toHaveBeenCalledWith(from);
    expect(google.buildGoogleOAuthUrl).toHaveBeenCalledWith('login');
  });

  it('sin state.from (redirección dura), no toca la página guardada: la usa la vuelta de Google', () => {
    sessionStorage.setItem('vuelta_tras_entrar', '/competitions/7');
    render(
      <MemoryRouter initialEntries={['/login']}>
        <GoogleSignInButton />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(google.guardaLaVueltaDeGoogle).toHaveBeenCalledWith(undefined);
    expect(sessionStorage.getItem('vuelta_tras_entrar')).toBe('/competitions/7');
  });
});

