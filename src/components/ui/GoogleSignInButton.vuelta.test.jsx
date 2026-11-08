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
const vuelta = vi.hoisted(() => ({ leeLaVueltaTrasEntrar: vi.fn(() => null) }));
vi.mock('../../utils/vueltaTrasEntrar', () => vuelta);
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

  it('sin state.from (redirección dura), usa la página guardada', () => {
    const guardada = { pathname: '/confirm-email-change', search: '?token=abc', hash: '' };
    vuelta.leeLaVueltaTrasEntrar.mockReturnValueOnce(guardada);
    render(
      <MemoryRouter initialEntries={['/login']}>
        <GoogleSignInButton />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button'));

    expect(google.guardaLaVueltaDeGoogle).toHaveBeenCalledWith(guardada);
  });
});

